const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const {
  createStaff, getAllStaff, deleteStaff, updateStaff,
  callNext, completeEntry, removeEntry,
  getAllTransactions, getDepartments, createDepartment,
  getOverview, getAllCustomers,
  requestQueueAction, getNotifications, approveNotification, rejectNotification, getUnreadCount,
} = require('../controllers/adminController');

// Department routes
router.get('/departments',                        protect, authorize('admin', 'staff'), getDepartments);
router.post('/departments',                       protect, authorize('admin'), createDepartment);

// Staff management (admin only)
router.get('/staff',                              protect, authorize('admin'), getAllStaff);
router.post('/staff',                             protect, authorize('admin'), createStaff);
router.put('/staff/:id',                          protect, authorize('admin'), updateStaff);
router.delete('/staff/:id',                       protect, authorize('admin'), deleteStaff);


// Queue operations (staff + admin)
router.post('/call-next/:queueId',                protect, authorize('staff', 'admin'), callNext);
router.post('/complete/:entryId',                 protect, authorize('staff', 'admin'), completeEntry);
router.delete('/entry/:entryId',                  protect, authorize('staff', 'admin'), removeEntry);

// Admin overview and reports
router.get('/overview',                           protect, authorize('admin'), getOverview);
router.get('/transactions',                       protect, authorize('admin'), getAllTransactions);
router.get('/customers',                          protect, authorize('admin'), getAllCustomers);

// Notification system
router.post('/notifications/request',             protect, authorize('staff'), requestQueueAction);
router.get('/notifications',                      protect, authorize('admin'), getNotifications);
router.get('/notifications/unread-count',         protect, authorize('admin'), getUnreadCount);
router.post('/notifications/:id/approve',         protect, authorize('admin'), approveNotification);
router.post('/notifications/:id/reject',          protect, authorize('admin'), rejectNotification);

module.exports = router;
