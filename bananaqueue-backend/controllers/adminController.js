const User       = require('../models/User');
const QueueEntry = require('../models/QueueEntry');
const Queue      = require('../models/Queue');
const Department = require('../models/Department');

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

    // Hash manually
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

// POST /api/admin/call-next/:queueId — staff/admin calls next customer
exports.callNext = async (req, res) => {
  try {
    const queue = await Queue.findById(req.params.queueId);
    if (!queue) return res.status(404).json({ message: 'Queue not found' });

    // Complete any currently called/serving entry
    await QueueEntry.updateMany(
      { queue: queue._id, status: { $in: ['called', 'serving'] } },
      { status: 'completed' }
    );

    // Get next waiting customer
    const next = await QueueEntry.findOne({ queue: queue._id, status: 'waiting' })
      .sort({ queueNumber: 1 })
      .populate('customer', 'name email');

    if (!next) {
      // No more customers — reset currentNumber display
      await Queue.findByIdAndUpdate(queue._id, { currentNumber: 0 });
      return res.status(404).json({ message: 'No customers waiting in this queue' });
    }

    await QueueEntry.findByIdAndUpdate(next._id, { status: 'called' });
    await Queue.findByIdAndUpdate(queue._id, { currentNumber: next.queueNumber });

    res.json({
      message: `Now calling number ${next.queueNumber}`,
      currentNumber: next.queueNumber,
      customer: next.customer,
      entryId: next._id,
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
      return {
        ...q.toObject(),
        waitingCount,
        currentEntry: currentEntry || null,
      };
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
