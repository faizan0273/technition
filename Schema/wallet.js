const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  balance: {
    type: Number,
    required: true,
    default: 0
  }
});

module.exports = mongoose.model('Wallet', walletSchema);
