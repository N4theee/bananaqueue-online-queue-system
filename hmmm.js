const express = require('express');
const router  = express.Router();
const { protect }   = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const {
  createStaff, getAllStaff, updateStaff, deleteStaff,
  callNext, completeEntry, removeEntry,
  getAllTransactions, getDepartments, createDepartment,
  getOverview, getAllCustomers, deleteCustomer,
  resetQueueNumber,
} = require('../controllers/adminController');

// Department routes
router.get('/departments',              protect, authorize('admin', 'staff'), getDepartments);
router.post('/departments',             protect, authorize('admin'), createDepartment);

// Staff/User management (admin only)
router.get('/staff',                    protect, authorize('admin'), getAllStaff);
router.post('/staff',                   protect, authorize('admin'), createStaff);
router.put('/staff/:id',                protect, authorize('admin'), updateStaff);
router.delete('/staff/:id',             protect, authorize('admin'), deleteStaff);

// Customer management (admin only)
router.get('/customers',                protect, authorize('admin'), getAllCustomers);
router.delete('/customers/:id',         protect, authorize('admin'), deleteCustomer);

// Queue operations (staff + admin)
router.post('/call-next/:queueId',      protect, authorize('staff', 'admin'), callNext);
router.post('/complete/:entryId',       protect, authorize('staff', 'admin'), completeEntry);
router.delete('/entry/:entryId',        protect, authorize('staff', 'admin'), removeEntry);

// Reset queue number (staff + admin) — only when queue is empty
router.post('/reset-queue/:queueId',    protect, authorize('staff', 'admin'), resetQueueNumber);

// Admin overview and reports
router.get('/overview',                 protect, authorize('admin'), getOverview);
router.get('/transactions',             protect, authorize('admin'), getAllTransactions);

module.exports = router;


/* 
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const dotenv     = require('dotenv');
const connectDB  = require('./config/db');

dotenv.config();
connectDB();

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'], credentials: true }
});

// Export io so controllers can emit events
module.exports.io = io;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/queues',  require('./routes/queues'));
app.use('/api/entries', require('./routes/entries'));
app.use('/api/admin',   require('./routes/admin'));

app.get('/', (req, res) => res.json({ message: 'BananaQueue API running' }));

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT} with Socket.IO`));
*/