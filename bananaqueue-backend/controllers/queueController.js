const Queue      = require('../models/Queue');
const QueueEntry = require('../models/QueueEntry');

// GET /api/queues — all queues with live stats
exports.getQueues = async (req, res) => {
  try {
    const queues = await Queue.find().populate('department', 'name description');

    // Attach waiting count to each queue
    const queuesWithStats = await Promise.all(queues.map(async (q) => {
      const waitingCount = await QueueEntry.countDocuments({
        queue: q._id,
        status: 'waiting'
      });
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

// PUT /api/queues/:id — admin only (toggle active, reset, etc.)
exports.updateQueue = async (req, res) => {
  try {
    const queue = await Queue.findByIdAndUpdate(req.params.id, req.body, { new: true });
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

// POST /api/queues/:id/reset — admin resets queue numbers
exports.resetQueue = async (req, res) => {
  try {
    await Queue.findByIdAndUpdate(req.params.id, { currentNumber: 0, nextNumber: 1 });
    await QueueEntry.updateMany(
      { queue: req.params.id, status: { $in: ['waiting', 'called', 'serving'] } },
      { status: 'cancelled' }
    );
    res.json({ message: 'Queue reset successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
