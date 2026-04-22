const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const {
  joinQueue, getMyEntry, getMyHistory,
  cancelEntry, getQueueEntries, getQueueHistory,
} = require('../controllers/entryController');

// Customer routes
router.post('/join',                        protect, authorize('customer'), joinQueue);
router.get('/my',                           protect, authorize('customer'), getMyEntry);
router.get('/my/history',                   protect, authorize('customer'), getMyHistory);
router.delete('/cancel',                    protect, authorize('customer'), cancelEntry);

// Staff + admin routes
router.get('/queue/:queueId',               protect, authorize('staff', 'admin'), getQueueEntries);
router.get('/queue/:queueId/history',       protect, authorize('staff', 'admin'), getQueueHistory);

module.exports = router;
