//Model class:
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    date: {
      type: Date,
      required: true
    },
     sellerid: {
        type: String,
        required: true
      },
    amount: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  });
  
const Transactionu = mongoose.model('Transactionu', transactionSchema);

module.exports = Transactionu;