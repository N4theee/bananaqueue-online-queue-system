const User         = require('../models/User');
const QueueEntry   = require('../models/QueueEntry');
const Queue        = require('../models/Queue');
const Department   = require('../models/Department');
const Notification = require('../models/Notification');
const bcrypt       = require('bcryptjs');

function getIO() {
  try { return require('../server').io; } catch { return null; }
}

// POST /api/admin/staff — admin creates a staff user assigned to a department
exports.createStaff = async (req, res) => {
  try {
    const { name, email, password, departmentId } = req.body;
    if (!name || !email || !password || !departmentId)
      return res.status(400).json({ message: 'All fields are required' });
    if (await User.findOne({ email }))
      return res.status(400).json({ message: 'Email already taken' });

    const dept = await Department.findById(departmentId);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const staff = await User.create({ name, email, password: hashedPassword, role: 'staff', department: departmentId });

    res.status(201).json({ id: staff._id, name: staff.name, email: staff.email, role: 'staff', department: dept.name });
  } catch (err) {
    console.error('CREATE STAFF ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/staff — list all staff
exports.getAllStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff' }).populate('department', 'name').select('-password');
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/staff/:id — remove a staff user
exports.deleteStaff = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Staff user removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/admin/staff/:id — update staff name / department
exports.updateStaff = async (req, res) => {
  try {
    const { name, departmentId } = req.body;
    const update = {};
    if (name)         update.name       = name.trim();
    if (departmentId) update.department = departmentId;
    const staff = await User.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('department', 'name').select('-password');
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// POST /api/admin/call-next/:queueId — staff/admin calls next customer
exports.callNext = async (req, res) => {
  try {
    const queue = await Queue.findById(req.params.queueId).populate('department', 'name');
    if (!queue) return res.status(404).json({ message: 'Queue not found' });

    // Mark any currently called/serving as completed
    await QueueEntry.updateMany(
      { queue: queue._id, status: { $in: ['called', 'serving'] } },
      { status: 'completed' }
    );

    // Get next waiting customer
    const next = await QueueEntry.findOne({ queue: queue._id, status: 'waiting' })
      .sort({ queueNumber: 1 })
      .populate('customer', 'name email');

    if (!next) {
      await Queue.findByIdAndUpdate(queue._id, { currentNumber: 0 });
      return res.status(404).json({ message: 'No customers waiting in this queue' });
    }

    await QueueEntry.findByIdAndUpdate(next._id, { status: 'called' });
    await Queue.findByIdAndUpdate(queue._id, { currentNumber: next.queueNumber });

    // Get remaining waiting list (after removing the one just called)
    const remaining = await QueueEntry.find({ queue: queue._id, status: 'waiting' })
      .sort({ queueNumber: 1 })
      .populate('customer', 'name email');

    const io = getIO();
    const queueName = queue.department?.name || queue.name;

    if (io) {
      // 1. Broadcast general queue update (for staff UI + public display)
      io.emit('queueUpdated', {
        queueId:       String(queue._id),
        event:         'called',
        currentNumber: next.queueNumber,
        customerId:    String(next.customer._id),
      });

      // 2. Notify the specific customer who was just called
      io.emit('customerCalled', {
        customerId:  String(next.customer._id),
        queueNumber: next.queueNumber,
        queueName,
      });

      // 3. Notify the customer who is now in 5th position (index 4)
      if (remaining.length >= 5) {
        const fifthCustomer = remaining[4];
        io.emit('almostInLine', {
          customerId:  String(fifthCustomer.customer._id),
          queueNumber: fifthCustomer.queueNumber,
          position:    5,
          queueName,
        });
      }
    }

    res.json({
      message: `Now calling number ${next.queueNumber}`,
      currentNumber: next.queueNumber,
      customer: next.customer,
      entryId:  next._id,
    });
  } catch (err) {
    console.error('CALL NEXT ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
};


// POST /api/admin/complete/:entryId — staff marks current as complete
exports.completeEntry = async (req, res) => {
  try {
    const entry = await QueueEntry.findByIdAndUpdate(
      req.params.entryId,
      { status: 'completed' },
      { new: true }
    );
    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    const io = getIO();
    if (io) io.emit('queueUpdated', { queueId: entry.queue, event: 'completed' });

    res.json({ message: 'Entry marked as completed', entry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/entry/:entryId — staff/admin removes a queue entry
exports.removeEntry = async (req, res) => {
  try {
    const entry = await QueueEntry.findByIdAndUpdate(
      req.params.entryId,
      { status: 'cancelled' },
      { new: true }
    );
    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    const io = getIO();
    if (io) io.emit('queueUpdated', { queueId: entry.queue, event: 'removed' });

    res.json({ message: 'Entry removed', entry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/transactions — full transaction history (admin only)
exports.getAllTransactions = async (req, res) => {
  try {
    const entries = await QueueEntry.find()
      .populate('customer', 'name email')
      .populate('queue', 'name')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/departments — list all departments
exports.getDepartments = async (req, res) => {
  try {
    const depts = await Department.find();
    res.json(depts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/admin/departments — create department
exports.createDepartment = async (req, res) => {
  try {
    const dept = await Department.create(req.body);
    res.status(201).json(dept);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/overview — all queues with live stats for admin dashboard
exports.getOverview = async (req, res) => {
  try {
    const queues = await Queue.find().populate('department', 'name');
    const overview = await Promise.all(queues.map(async (q) => {
      const waitingCount = await QueueEntry.countDocuments({ queue: q._id, status: 'waiting' });
      const currentEntry = await QueueEntry.findOne({
        queue: q._id, status: { $in: ['called', 'serving'] }
      }).populate('customer', 'name email');
      return { ...q.toObject(), waitingCount, currentEntry: currentEntry || null };
    }));
    res.json(overview);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/customers — list all customers
exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' }).select('-password').sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── NOTIFICATION ENDPOINTS ────────────────────────────────────

// POST /api/admin/notifications/request — staff requests enable/disable/reset
exports.requestQueueAction = async (req, res) => {
  try {
    const { queueId, type } = req.body; // type: REQUEST_ENABLE | REQUEST_DISABLE | REQUEST_RESET
    if (!queueId || !type) return res.status(400).json({ message: 'queueId and type are required' });

    const queue = await Queue.findById(queueId).populate('department', 'name');
    if (!queue) return res.status(404).json({ message: 'Queue not found' });

    const typeLabels = {
      REQUEST_ENABLE:  'enable',
      REQUEST_DISABLE: 'disable',
      REQUEST_RESET:   'reset'
    };

    const notification = await Notification.create({
      staff:     req.user._id,
      staffName: req.user.name,
      queue:     queueId,
      queueName: queue.department?.name || queue.name,
      type,
      message: `${req.user.name} requested to ${typeLabels[type]} the ${queue.department?.name || queue.name} queue.`,
    });

    const io = getIO();
    if (io) io.emit('newNotification', notification);

    res.status(201).json({ message: 'Request sent to admin', notification });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/notifications — admin fetches all pending notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate('staff', 'name email')
      .populate('queue', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/admin/notifications/:id/approve — admin approves request
exports.approveNotification = async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ message: 'Notification not found' });

    const queue = await Queue.findById(notif.queue).populate('department', 'name');
    if (!queue) return res.status(404).json({ message: 'Queue not found' });

    if (notif.type === 'REQUEST_ENABLE')  await Queue.findByIdAndUpdate(notif.queue, { isActive: true });
    if (notif.type === 'REQUEST_DISABLE') await Queue.findByIdAndUpdate(notif.queue, { isActive: false });
    if (notif.type === 'REQUEST_RESET') {
      await Queue.findByIdAndUpdate(notif.queue, { currentNumber: 0, nextNumber: 1 });
      await QueueEntry.updateMany(
        { queue: notif.queue, status: { $in: ['waiting', 'called', 'serving'] } },
        { status: 'cancelled' }
      );
    }

    notif.status = 'approved';
    notif.readByAdmin = true;
    await notif.save();

    const io = getIO();
    if (io) {
      io.emit('queueUpdated', { queueId: notif.queue, event: 'toggled' });
      io.emit('notificationResolved', { notifId: notif._id, status: 'approved' });
    }

    res.json({ message: 'Request approved and action applied', notif });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/admin/notifications/:id/reject — admin rejects request
exports.rejectNotification = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', readByAdmin: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notification not found' });

    const io = getIO();
    if (io) io.emit('notificationResolved', { notifId: notif._id, status: 'rejected' });

    res.json({ message: 'Request rejected', notif });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/notifications/unread-count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ status: 'pending', readByAdmin: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
