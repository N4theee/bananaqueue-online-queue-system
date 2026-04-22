const QueueEntry = require('../models/QueueEntry');
const Queue      = require('../models/Queue');

// POST /api/entries/join
exports.joinQueue = async (req, res) => {
  try {
    const { queueId } = req.body;
    if (!queueId) return res.status(400).json({ message: 'queueId is required' });

    const customerId = req.user._id;

    // Block duplicate active entry
    const existing = await QueueEntry.findOne({
      customer: customerId,
      status: { $in: ['waiting', 'called', 'serving'] },
    }).populate('queue', 'name');
    if (existing)
      return res.status(400).json({ message: `You are already in ${existing.queue.name}. Cancel first.` });

    const queue = await Queue.findById(queueId);
    if (!queue)       return res.status(404).json({ message: 'Queue not found' });
    if (!queue.isActive) return res.status(400).json({ message: 'This queue is currently unavailable' });

    const queueNumber = queue.nextNumber;
    await Queue.findByIdAndUpdate(queueId, { $inc: { nextNumber: 1 } });

    // Generate transactionId manually — avoids pre('save') hook issues
    const transactionId = 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();

    const entry = await QueueEntry.create({
      queue: queueId,
      customer: customerId,
      queueNumber,
      transactionId,   // ← pass it directly, bypass the hook
    });

    const populated = await QueueEntry.findById(entry._id).populate('queue', 'name currentNumber');
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

// GET /api/entries/my/history — full history for customer
exports.getMyHistory = async (req, res) => {
  try {
    const entries = await QueueEntry.find({ customer: req.user._id })
      .populate('queue', 'name')
      .sort({ createdAt: -1 });
    res.json(entries);
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
    );
    if (!entry) return res.status(404).json({ message: 'No cancellable queue entry found' });
    res.json({ message: 'Queue entry cancelled', entry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/entries/queue/:queueId — staff/admin sees waiting list for a queue
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

// GET /api/entries/queue/:queueId/history — staff/admin sees completed entries
exports.getQueueHistory = async (req, res) => {
  try {
    const entries = await QueueEntry.find({
      queue: req.params.queueId,
      status: { $in: ['completed', 'cancelled'] }
    })
      .populate('customer', 'name email')
      .sort({ updatedAt: -1 })
      .limit(50);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
