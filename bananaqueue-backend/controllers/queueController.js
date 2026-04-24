const Queue      = require('../models/Queue');
const QueueEntry = require('../models/QueueEntry');

function getIO() {
  try { return require('../server').io; } catch { return null; }
}

// GET /api/queues — all queues with live stats
exports.getQueues = async (req, res) => {
  try {
    const queues = await Queue.find().populate('department', 'name description');
    const queuesWithStats = await Promise.all(queues.map(async (q) => {
      const waitingCount = await QueueEntry.countDocuments({ queue: q._id, status: 'waiting' });
      return { ...q.toObject(), waitingCount };
    }));
    res.json(queuesWithStats);
  } catch (err) {
    console.error('GET QUEUES ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/queues/:id — single queue with stats
exports.getQueue = async (req, res) => {
  try {
    const queue = await Queue.findById(req.params.id).populate('department', 'name description');
    if (!queue) return res.status(404).json({ message: 'Queue not found' });
    const waitingCount = await QueueEntry.countDocuments({ queue: queue._id, status: 'waiting' });
    res.json({ ...queue.toObject(), waitingCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/queues — admin only
exports.createQueue = async (req, res) => {
  try {
    const queue = await Queue.create(req.body);
    res.status(201).json(queue);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/queues/:id — admin only (toggle active, etc.)
exports.updateQueue = async (req, res) => {
  try {
    const queue = await Queue.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('department', 'name');
    const io = getIO();
    if (io) io.emit('queueUpdated', { queueId: queue._id, isActive: queue.isActive, department: queue.department?.name });
    res.json(queue);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/queues/:id — admin only
exports.deleteQueue = async (req, res) => {
  try {
    await Queue.findByIdAndDelete(req.params.id);
    res.json({ message: 'Queue deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/queues/:id/reset — admin or staff (only if queue is empty)
exports.resetQueue = async (req, res) => {
  try {
    const queueId = req.params.id;
    // Staff can only reset if there are no waiting/active customers
    const activeCount = await QueueEntry.countDocuments({
      queue: queueId,
      status: { $in: ['waiting', 'called', 'serving'] }
    });
    if (activeCount > 0 && req.user.role !== 'admin') {
      return res.status(400).json({ message: 'Cannot reset queue while customers are waiting or being served.' });
    }
    await Queue.findByIdAndUpdate(queueId, { currentNumber: 0, nextNumber: 1 });
    await QueueEntry.updateMany(
      { queue: queueId, status: { $in: ['waiting', 'called', 'serving'] } },
      { status: 'cancelled' }
    );
    const io = getIO();
    if (io) io.emit('queueReset', { queueId });
    res.json({ message: 'Queue reset to #1 successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
