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