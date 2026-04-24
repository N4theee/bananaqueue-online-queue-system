const QueueEntry   = require('../models/QueueEntry');
const Queue        = require('../models/Queue');

function getIO() {
  try { return require('../server').io; } catch { return null; }
}

// POST /api/entries/join
exports.joinQueue = async (req, res) => {
  try {
    const { queueId } = req.body;
    if (!queueId) return res.status(400).json({ message: 'queueId is required' });

    const customerId = req.user._id;

    const existing = await QueueEntry.findOne({
      customer: customerId,
      status: { $in: ['waiting', 'called', 'serving'] },
    }).populate('queue', 'name');
    if (existing)
      return res.status(400).json({ message: `You are already in ${existing.queue.name}. Cancel first.` });

    const queue = await Queue.findById(queueId);
    if (!queue)        return res.status(404).json({ message: 'Queue not found' });
    if (!queue.isActive) return res.status(400).json({ message: 'This queue is currently unavailable' });

    const queueNumber  = queue.nextNumber;
    await Queue.findByIdAndUpdate(queueId, { $inc: { nextNumber: 1 } });

    const transactionId = 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();

    const entry = await QueueEntry.create({ queue: queueId, customer: customerId, queueNumber, transactionId });
    const populated = await QueueEntry.findById(entry._id).populate('queue', 'name currentNumber');

    const io = getIO();
    if (io) io.emit('queueUpdated', { queueId, event: 'joined', queueNumber });

    res.status(201).json(populated);
  } catch (err) {
    console.error('JOIN ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/entries/my — customer's current active entry
exports.getMyEntry = async (req, res) => {
  try {
    const entry = await QueueEntry.findOne({
      customer: req.user._id,
      status: { $in: ['waiting', 'called', 'serving'] }
    }).populate('queue', 'name currentNumber department').populate('queue.department', 'name');
    res.json(entry || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/entries/my/history — full history for customer (excluding hidden)
exports.getMyHistory = async (req, res) => {
  try {
    const entries = await QueueEntry.find({
      customer: req.user._id,
      hiddenByCustomer: { $ne: true }
    })
      .populate('queue', 'name')
      .sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/entries/my/history/clear — customer clears their history view
exports.clearMyHistory = async (req, res) => {
  try {
    await QueueEntry.updateMany(
      { customer: req.user._id, status: { $in: ['completed', 'cancelled'] } },
      { hiddenByCustomer: true }
    );
    res.json({ message: 'History cleared' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/entries/cancel — customer cancels their own entry
exports.cancelEntry = async (req, res) => {
  try {
    const entry = await QueueEntry.findOneAndUpdate(
      { customer: req.user._id, status: { $in: ['waiting'] } },
      { status: 'cancelled' },
      { new: true }
    ).populate('queue', 'name department');

    if (!entry) return res.status(404).json({ message: 'No cancellable queue entry found' });

    const io = getIO();
    if (io) {
      // General queue update (for staff + public display)
      io.emit('queueUpdated', { queueId: String(entry.queue._id), event: 'cancelled' });
      // Targeted event for staff notification bell
      io.emit('customerCancelled', {
        queueId:     String(entry.queue._id),
        queueNumber: entry.queueNumber,
        customerName: req.user.name || req.user.email,
      });
    }

    res.json({ message: 'Queue entry cancelled', entry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// GET /api/entries/queue/:queueId — staff/admin sees waiting list
exports.getQueueEntries = async (req, res) => {
  try {
    const entries = await QueueEntry.find({
      queue: req.params.queueId,
      status: { $in: ['waiting', 'called', 'serving'] }
    })
      .populate('customer', 'name email')
      .sort({ queueNumber: 1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/entries/queue/:queueId/history — completed + cancelled entries
exports.getQueueHistory = async (req, res) => {
  try {
    const entries = await QueueEntry.find({
      queue: req.params.queueId,
      status: { $in: ['completed', 'cancelled'] }
    })
      .populate('customer', 'name email')
      .sort({ updatedAt: -1 })
      .limit(100);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/entries/queue/:queueId/stats/today — staff daily stats
exports.getDailyStats = async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const count = await QueueEntry.countDocuments({
      queue: req.params.queueId,
      status: 'completed',
      updatedAt: { $gte: start }
    });
    res.json({ completed: count, date: start });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
