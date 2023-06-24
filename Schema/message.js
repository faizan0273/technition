const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  text: { type: String },
  type: {
    type: String,
    enum: ['text', 'image'],
    required: true
  },
  image: { type: String }, // New field to store the filename of the image
  roomId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Message', messageSchema);
