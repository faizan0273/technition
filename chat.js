const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const cors = require("cors");
const User = require("./Schema/user");
const Seller = require("./Schema/SellerInfo");
app.use(cors());


mongoose.connect('mongodb+srv://doadmin:319go4y5EZ2PC6R8@db-mongodb-nyc1-68274-ddba419b.mongo.ondigitalocean.com/admin?tls=true&authSource=admin&replicaSet=db-mongodb-nyc1-68274', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));


  app.get('/', function (req, res) {
    res.json({ message: 'Server is running on v27!' });

  });

const messageSchema = new mongoose.Schema({
  senderId: String,
  receiverId: String,
  text: String,
  roomId: String,
  createdAt: String
});

const Message = mongoose.model('Message', messageSchema);

app.get('/messages/:senderId/:receiverId/:page', async (req, res) => {
  const { senderId, receiverId, page } = req.params;
  const limit = 10; // set the number of messages to return per page

  try {
    let query = {
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ]
    };

    if (req.query.lastMessageId) {
      query._id = { $lt: req.query.lastMessageId }
    }

    const messages = await Message.find(query)
      .select('senderId receiverId text _id createdAt')
      .limit(limit)
      .sort({ _id: -1 })
      .lean();

    const lastMessageId = messages.length > 0 ? messages[messages.length - 1]._id : null;

    res.status(200).json({ messages, lastMessageId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.get('/receivers/:senderId', async (req, res) => {
  try {
    const { senderId } = req.params;
    const receiverIds = await Message.distinct('receiverId', { senderId });
    const lastMessages = {};
    for (const receiverId of receiverIds) {
      const lastMessageSender = await Message.findOne({ senderId, receiverId }).select('-receiverId -senderId -roomId -__v').sort({ createdAt: -1 });
      const lastMessageReceiver = await Message.findOne({ senderId: receiverId, receiverId: senderId }).select('-receiverId -senderId -roomId -__v').sort({ createdAt: -1 });
      
      let lastMessage;
      if (lastMessageSender && lastMessageReceiver) {
        lastMessage = lastMessageSender.createdAt > lastMessageReceiver.createdAt ? lastMessageSender : lastMessageReceiver;
      } else if (lastMessageSender) {
        lastMessage = lastMessageSender;
      } else if (lastMessageReceiver) {
        lastMessage = lastMessageReceiver;
      } else {
        lastMessage = null;
      }

      if (lastMessage) {
        let receiverInfo = await User.findById(receiverId);
        if (!receiverInfo) {
          receiverInfo = await Seller.findById(receiverId);
        }
        lastMessage.receiverName = receiverInfo.firstname + ' ' + receiverInfo.lastname;
        console.log(lastMessage);
        lastMessages[receiverId] = lastMessage;
        console.log(lastMessages[receiverId].receiverName);
      }
      
    }
    const response = {};
for (const [receiverId, lastMessage] of Object.entries(lastMessages)) {
  const { _id, text, createdAt, receiverName } = lastMessage;
  response[receiverId] = { _id, text, createdAt, receiverName };
}
return res.status(200).json({lastMessages:response});

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join', (room) => {
    console.log(`Joining room ${room}`);
    socket.join(room);
  });
  

  socket.on('message', (data) => {
    const { senderId, receiverId, text, roomId } = data;
    console.log(data);
    const message = new Message({
      senderId: senderId,
      receiverId: receiverId,
      text: text,
      roomId: roomId, // save roomId to the message object
      createdAt: Date.now() 
    });
    console.log(message);
    message.save().then(() => {
      console.log("saved");
      if (roomId) {
        socket.to(roomId).emit('message', data); // emit message to the specified room
      } else {
        socket.broadcast.emit('message', data); // emit message to all clients except the sender
      }
      socket.emit('message', data); // emit message to the sender
    });
  });


  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

http.listen(3000, () => {
  console.log('Listening on port 3000');
});
