const mongoose = require('mongoose');

const QueueEntrySchema = new mongoose.Schema({
  queue:         { type: mongoose.Schema.Types.ObjectId, ref: 'Queue',      required: true },
  customer:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',       required: true },
  queueNumber:   { type: Number, required: true },
  status:            { type: String, enum: ['waiting','called','serving','completed','cancelled'], default: 'waiting' },
  transactionId:     { type: String, unique: true },
  hiddenByCustomer:  { type: Boolean, default: false },
}, { timestamps: true });

// NO pre('save') hook here anymore

module.exports = mongoose.model('QueueEntry', QueueEntrySchema);