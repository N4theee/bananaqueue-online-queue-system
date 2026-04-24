const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const {
  joinQueue, getMyEntry, getMyHistory, clearMyHistory,
  cancelEntry, getQueueEntries, getQueueHistory, getDailyStats,
} = require('../controllers/entryController');

// Customer routes
router.post('/join',                        protect, authorize('customer'), joinQueue);
router.get('/my',                           protect, authorize('customer'), getMyEntry);
router.get('/my/history',                   protect, authorize('customer'), getMyHistory);
router.delete('/my/history/clear',          protect, authorize('customer'), clearMyHistory);
router.delete('/cancel',                    protect, authorize('customer'), cancelEntry);

// Staff + admin routes
router.get('/queue/:queueId',               protect, authorize('staff', 'admin'), getQueueEntries);
router.get('/queue/:queueId/history',       protect, authorize('staff', 'admin'), getQueueHistory);
router.get('/queue/:queueId/stats/today',   protect, authorize('staff', 'admin'), getDailyStats);

module.exports = router;
