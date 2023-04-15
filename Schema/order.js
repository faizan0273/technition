const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  type: {
    type: String,
    enum: ['Electric', 'Plumber', 'Cooling', 'Heater'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  day: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  image: {
    type: Buffer,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['New', 'In Progress', 'Completed','Cancelled'],
    default: 'New'
  },
  customerLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

orderSchema.index({ customerLocation: '2dsphere' });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
