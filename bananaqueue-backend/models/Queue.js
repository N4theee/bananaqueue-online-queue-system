const mongoose = require('mongoose');

const QueueSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  department:   { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  isActive:     { type: Boolean, default: true },
  currentNumber:{ type: Number, default: 0 },
  nextNumber:   { type: Number, default: 1 },
}, { timestamps: true });

module.exports = mongoose.model('Queue', QueueSchema);