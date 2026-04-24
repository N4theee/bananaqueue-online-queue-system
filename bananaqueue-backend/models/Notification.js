const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  staff:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  staffName:  { type: String },
  queue:      { type: mongoose.Schema.Types.ObjectId, ref: 'Queue', required: true },
  queueName:  { type: String },
  type:       { type: String, enum: ['REQUEST_ENABLE', 'REQUEST_DISABLE', 'REQUEST_RESET'], required: true },
  message:    { type: String },
  status:     { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  readByAdmin:{ type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
