const mongoose = require('mongoose');
// Transaction Schema
const transactionSchema = new mongoose.Schema({
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    method: {
      type: String,
      enum: ['bank', 'mobile'],
      required: true
    },
  }, { timestamps: true });

  // Export schemas
  module.exports = mongoose.model('Transaction', transactionSchema);