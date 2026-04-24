const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const {
  getQueues, getQueue, createQueue, updateQueue, deleteQueue, resetQueue
} = require('../controllers/queueController');

router.get('/',           protect, getQueues);
router.get('/:id',        protect, getQueue);
router.post('/',          protect, authorize('admin'), createQueue);
router.put('/:id',        protect, authorize('admin'), updateQueue);
router.delete('/:id',     protect, authorize('admin'), deleteQueue);
// Staff can also call reset (controller enforces empty-queue rule)
router.post('/:id/reset', protect, authorize('admin', 'staff'), resetQueue);

module.exports = router;
