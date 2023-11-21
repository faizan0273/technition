// const bcrypt = require("bcrypt");
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const bcrypt = require('bcrypt');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
var upload = multer({ storage: storage });
const spacesEndpoint = new AWS.Endpoint('nyc3.digitaloceanspaces.com');
const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: 'DO00VEVHP872BQHADNCW',
  secretAccessKey: 'WT1H8ePdR4p8+yoLJsZ6qpod7q0gcBcJ+8kcFx34d2s',
  s3ForcePathStyle: true,
});

const app = express();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
app.use(bodyParser.json());
const sellerAuthMiddleware = require('./authMiddleware');
const User = require("./Schema/user");
const Message = require("./Schema/message");
const Order = require("./Schema/order");
const Seller = require("./Schema/SellerInfo");
const Wallet = require("./Schema/wallet");
const Transaction = require("./Schema/transaction");
const Transactionu = require("./Schema/userTransactions");
const cors = require("cors");
const router = require("./Admin/adminRouter")
const http = require('http').createServer(app);
const { Server } = require("socket.io");
const fs = require('fs');
app.use(cors());
app.use('/uploads', express.static('/app/uploads'));
app.use(router)

// start the server
const port = process.env.PORT || 8000;
http.listen(port, () => {
  console.log(`Server listening on port ${port}`)
});
const io = new Server(http, {
  cors: {
    origin: "https://clownfish-app-mo7d6.ondigitalocean.app/",
    credentials: true,
  },
});

const mongoURI = 'mongodb+srv://faizan:4yfuyMYr7sk7EJwz@cluster0.lprxxnp.mongodb.net/technician';

// Extract the database name from the URI


// Connect to MongoDB
mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB:');


  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });


app.get('/', function (req, res) {
  res.json({ message: 'Technician App working on latest version' });

});

const image = new mongoose.Schema({
  // ...other order fields

  image: {
    type: String,
    required: true
  }
});
const Image = mongoose.model('Image', image);

app.post('/upload', upload.fields([{ name: 'image', maxCount: 1 }]), async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Assuming the file field name is "image" in the form data
    const file = req.files.image[0]; // Get the first file from the array of files
    // Read the file data and convert it to a buffer
    const fileData = fs.readFileSync(file.path);

    // Generate a unique filename or use any other logic to determine the filename
    const filename = `${uuidv4()}${path.extname(file.originalname)}`;

    // Upload the file to DigitalOcean Spaces
    const params = {
      Body: fileData, // Pass the fileData buffer as the Body parameter
      Bucket: 'technician',
      Key: filename
    };

    s3.putObject(params, function (err, data) {
      if (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
      } else {
        console.log(data);
        // Save the file path or metadata to the database
        const image = new Image({ image: filename });
        image.save();

        res.status(200).json({ message: filename });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
app.get('/image/:imageName', (req, res) => {
  const bucketName = 'technician';
  const imageKey = `${req.params.imageName}`;

  // Create a Readable Stream to store the image data
  const imageStream = fs.createWriteStream('temp-image.jpg');

  // Create a GET request to retrieve the image from the bucket
  const getObjectParams = { Bucket: bucketName, Key: imageKey };
  const s3Stream = s3.getObject(getObjectParams).createReadStream();

  // Pipe the image stream to the response object
  s3Stream.pipe(imageStream)
    .on('error', (err) => {
      console.error('Error retrieving the image:', err);
      res.status(500).send('Internal Server Error');
    })
    .on('close', () => {
      // Send the image file as a response
      res.sendFile('temp-image.jpg', { root: __dirname }, (err) => {
        if (err) {
          console.error('Error sending the image:', err);
          res.status(500).send('Internal Server Error');
        }
      });
    });
});

//Chat Module
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

    const skip = (page - 1) * limit; // calculate the number of messages to skip

    const messages = await Message.find(query)
      .select('senderId receiverId text _id createdAt type image')
      .skip(skip)
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
        lastMessages[receiverId] = lastMessage;
      }

    }
    const response = {};
    for (const [receiverId, lastMessage] of Object.entries(lastMessages)) {
      const { _id, text, type, createdAt, receiverName } = lastMessage;
      response[receiverId] = { _id, text, createdAt, receiverName };
    }
    return res.status(200).json({ lastMessages: response });

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


  socket.on('message', (data, callback) => {
    const { senderId, receiverId, text, roomId, type, image } = data;
    console.log(data);
    let message;
    if (text.trim().length > 0) {
      message = new Message({
        senderId: senderId,
        receiverId: receiverId,
        text: text,
        type: type,
        roomId: roomId,
        createdAt: Date.now()
      });
    } else {
      message = new Message({
        senderId: senderId,
        receiverId: receiverId,
        type: type,
        image: image,
        roomId: roomId,
        createdAt: Date.now()
      });
    }

    message.save().then(() => {
      if (roomId) {
        socket.to(roomId).emit('message', data);
      } else {
        socket.broadcast.emit('message', data);
      }
      socket.emit('message', data);
    });
  });






  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

//Seller API's
// Signup API
app.post("/signup", async (req, res) => {
  const {
    firstname,
    lastname,
    password,
    phonenumber,
    city,
    dateofbirth,
    type,
    imagename
  } = req.body;

  const userExists = await Seller.findOne({ phonenumber });
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Hash the password before storing in the database
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const seller = new Seller({
      firstname,
      lastname,
      password: hashedPassword,
      phonenumber,
      city,
      dateofbirth,
      type,
      imagename
    });

    await seller.save();

    res.status(201).json({
      message: "Seller created successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error occurred while creating seller",
      error: error.message,
    });
  }
});

// Login API
app.post("/login", async (req, res) => {
  const { phonenumber, password } = req.body;

  try {
    const seller = await Seller.findOne({ phonenumber });

    if (!seller) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }
    if (seller.access === "Accepted") {


      const user_ = await Seller.findOne({ phonenumber, token: { $ne: null } });
      if (user_) {
        return res.status(400).json({ message: 'User is already logged in' });
      }

      // Compare the password provided with the hashed password stored in the database
      const passwordMatch = await bcrypt.compare(password, seller.password);

      if (!passwordMatch) {
        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

      const token = jwt.sign({ userId: seller._id }, 'secret');
      seller.token = token;
      await seller.save();

      res.status(200).json({
        message: "Login successful",
        id: seller._id,
        token: token
      });
    } else {
      return res.status(401).json({
        message: "Your Account is blocked you cannot login",
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error occurred while logging in",
      error: error.message,
    });
  }
});

app.post('/forgot-passwordc/email', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const user = await Seller.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    const nodemailer = require('nodemailer');

    // create a transport object using Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'immuhammadfaizan@gmail.com',
        pass: 'nryxirwyakabaebt'
      }
    });

    // generate a 6 digit code
    const code = Math.floor(1000 + Math.random() * 9000);

    const updateResult = await Seller.findOneAndUpdate({ email }, { storedCode: code }, { upsert: true });

    // send an email to the user with the code
    const mailOptions = {
      from: 'immuhammadfaizan@gmail.com',
      to: email,
      subject: 'Verification Code',
      text: `Your verification code is ${code}`
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      return res.status(200).json({ message: "Code sent to email" });
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Forgot Password Screen 2 for customer
app.post('/forgot-passwordc/code', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // retrieve storedCode from your database using the email address
  const user = await Seller.findOne({ email });
  if (user) {
    const storedCode = user.storedCode;

    if (code == storedCode) {
      // code is correct, allow user to reset password
      return res.status(200).json({ message: 'Code verified' });
    } else {
      // code is incorrect
      return res.status(400).json({ message: 'Invalid verification code' });
    }
  }
  else {
    return res.status(400).json({ message: 'Error' });
  }

});

// Forgot Password Screen 3 for customer
app.post('/forgot-passwordc/password', async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const user = await Seller.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    // update password in database
    // const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Seller.findOneAndUpdate({ email }, { password: hashedPassword }, { upsert: true });
    return res.status(200).json({ message: 'Password updated' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Update seller type API
app.put("/seller/:id/type", async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;

  try {
    const seller = await Seller.findByIdAndUpdate(id, { type }, { new: true });

    if (!seller) {
      return res.status(404).json({
        message: "Seller not found",
      });
    }

    res.status(200).json({
      message: "Seller type updated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message,
    });
  }
});

// Update seller documents API
app.put('/seller/update-documents', sellerAuthMiddleware, upload.fields([{ name: 'passportDocument', maxCount: 1 }, { name: 'trainingDocument', maxCount: 1 }, { name: 'healthDocument', maxCount: 1 }]), async (req, res) => {
  const { sellerId } = req.body;
  const { passportDocument, trainingDocument, healthDocument } = req.files;
  console.log(sellerId);
  try {
    const seller = await Seller.findById(sellerId);

    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    if (passportDocument) {
      seller.passportDocument = passportDocument[0].buffer;
    }

    if (trainingDocument) {
      seller.trainingDocument = trainingDocument[0].buffer;
    }

    if (healthDocument) {
      seller.healthDocument = healthDocument[0].buffer;
    }

    await seller.save();

    res.json({ message: 'Documents updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get seller info API
app.get('/seller/:sellerId', async (req, res) => {
  const { sellerId } = req.params;

  try {
    const seller = await Seller.findById(sellerId).select('-healthDocument -trainingDocument -passportDocument');

    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    // remove sensitive data before sending the response
    const { password, token, ...sellerInfo } = seller.toObject();

    res.json(sellerInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout API
app.put('/seller/logout', async (req, res) => {
  const { sellerId } = req.body;
  console.log(req.body);
  try {
    const seller = await Seller.findById(sellerId);
    console.log(req.body);
    if (!seller) {
      console.log(req.body);
      return res.status(404).json({ error: 'Seller not found' });
    }
    seller.token = null;
    await seller.save();
    res.json({ message: 'Seller logged out successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update seller information
app.put('/updateseller/:sellerId', async (req, res) => {
  const sellerId = req.params.sellerId;

  try {
    // Update Personal Info
    if (req.body.firstname || req.body.lastname || req.body.email || req.body.phonenumber || req.body.city || req.body.dateofbirth) {
      await Seller.updateOne({ _id: sellerId }, { $set: req.body });
    }

    res.status(200).json({ success: true, message: 'seller information updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Add seller amount to wallet
app.post('/wallet', async (req, res) => {
  try {
    const { seller, amount } = req.body;

    // Check if a wallet exists for the seller
    let wallet = await Wallet.findOne({ seller });
    let seller_ = await Seller.findById(seller);
    if (seller_) {
      seller_.earnings += Number(amount);
      console.log(seller_.earnings);
      await seller_.save();
    }
    if (!wallet) {
      // If a wallet does not exist, create a new one with the initial balance
      wallet = new Wallet({ seller, balance: amount });
      await wallet.save();
    } else {
      // If a wallet exists, add the new amount to the existing balance
      wallet.balance += Number(amount);
      await wallet.save();
    }

    res.status(200).json({ message: "Amount added to seller wallet" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//transactions of seller from their wallet
app.post('/transactions', sellerAuthMiddleware, async (req, res) => {
  try {
    const { seller, amount, method } = req.body;

    // Check if a wallet exists for the seller
    let wallet = await Wallet.findOne({ seller: seller });

    if (!wallet) {
      // If a wallet does not exist, return an error message
      return res.status(400).json({ messagee: 'seller wallet does not exist' });
    } else if (wallet.balance < amount) {
      // If the seller wants to transact more than their wallet balance, return an error message
      return res.status(400).json({ messagee: 'Insufficient balance in seller wallet' });
    }

    // If the seller has sufficient balance, update the wallet balance by subtracting the transaction amount
    wallet.balance -= amount;
    await wallet.save();

    // Create a new transaction with the seller ID and the transaction details
    const transaction = new Transaction({ seller, amount, method });
    const savedTransaction = await transaction.save();

    res.status(200).json({ message: savedTransaction });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//get amount of seller wallet
app.get('/wallet/:sellerId', sellerAuthMiddleware, async (req, res) => {
  try {
    const sellerId = req.params.sellerId;

    // Check if a wallet exists for the seller
    const wallet = await Wallet.findOne({ seller: sellerId });

    if (!wallet) {
      // If a wallet does not exist, return a 400 Not Found response with an error message
      return res.status(400).json({ message: 'seller wallet not found' });
    }
    // If a wallet exists, return the wallet balance as a response
    res.status(200).json({ balance: wallet.balance.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//return all transactions of seller
app.get('/getransactions/:sellerId', sellerAuthMiddleware, async (req, res) => {
  try {
    const sellerId = req.params.sellerId;

    // Find all transactions of the seller by querying the Transaction model
    const transactions = await Transaction.find({ seller: sellerId }).select('-__v -updatedAt ');

    // Return the transactions as a response
    res.status(200).json({ message: transactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/location/:lon/:lat', async (req, res) => {
  try {
    const lon = Number(req.params.lon);
    const lat = Number(req.params.lat);
    const result = getAddressFromCoordinates(Number(lat), Number(lon));
    res.status(200).json({ location: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/orders/:id/accept', async (req, res) => {
  const orderId = req.params.id;
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    // check if updatedAmount is set and equal to amount
    if (order.updatedAmount && order.amount != order.updatedAmount) {
      order.amount = order.updatedAmount || order.amount; // set amount to updatedAmount if set, otherwise use original amount
      order.updatedAmount = undefined; // delete updatedAmount field
    }
    order.status = "In Progress";
    await order.save();
    res.json({ message: "Order successfully accepted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put('/orders/:id/cancell', async (req, res) => {
  const orderId = req.params.id;
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    order.status = "Cancelled";
    await order.save();
    res.json({ message: "Order successfully cancelled" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put('/orders/:id/complete', async (req, res) => {
  const orderId = req.params.id;
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    order.status = "Completed";
    await order.save();
    const senderId = order.sellerId;
    const receiverId = order.userId;
    await Message.deleteMany({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    });
    res.json({ message: "Order successfully completed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

//get amount of seller earnings
app.get('/earnings/:sellerId', async (req, res) => {
  const { sellerId } = req.params;

  try {
    const seller = await Seller.findById(sellerId).select('earnings');

    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    // remove sensitive data before sending the response
    const { _id, password, token, ...sellerInfo } = seller.toObject();

    res.json({ message: sellerInfo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});


//Custumor APIs
app.post('/costumersignup', async (req, res) => {

  try {

    const existingUser = await User.findOne({ email: req.body.phonenumber });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }


    // Hash the password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // Create the user
    const user = new User({
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      password: hashedPassword,
      phonenumber: req.body.phonenumber,
      city: req.body.city,
      dateofbirth: req.body.dateofbirth,
    });
    console.log(user);
    const savedUser = await user.save();

    res.status(200).json({ message: 'User created successfully', user: savedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/customersignin', async (req, res) => {
  try {
    // Extract phone number and password from request body
    const { phonenumber, password } = req.body;

    // Find user by phone number
    const user = await User.findOne({ phonenumber: phonenumber });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Check if the user account is blocked
    if (user.access !== "Accepted") {
      return res.status(401).json({ message: 'Your account is blocked. You cannot log in.' });
    }

    // Check password validity
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Create and return the JWT token
    const token = jwt.sign({ userId: user._id },'mysecretkey', { expiresIn: '1h' });
    res.json({ message: 'Authentication successful', token: token, id: user._id });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Get customer info API
app.get('/customer/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).select("-__v");

    if (!user) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    // remove sensitive data before sending the response
    const { password, token, ...Costumerinfo } = user.toObject();

    res.json(Costumerinfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/forgot-password/email', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    const nodemailer = require('nodemailer');

    // create a transport object using Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'immuhammadfaizan@gmail.com',
        pass: 'nryxirwyakabaebt'
      }
    });

    // generate a 6 digit code
    const code = Math.floor(1000 + Math.random() * 9000);

    const updateResult = await User.findOneAndUpdate({ email }, { storedCode: code }, { upsert: true });

    // send an email to the user with the code
    const mailOptions = {
      from: 'immuhammadfaizan@gmail.com',
      to: email,
      subject: 'Verification Code',
      text: `Your verification code is ${code}`
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      return res.status(200).json({ message: "Code sent to email" });
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Forgot Password Screen 2 for customer
app.post('/forgot-password/code', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // retrieve storedCode from your database using the email address
  const user = await User.findOne({ email });
  if (user) {
    const storedCode = user.storedCode;

    if (code == storedCode) {
      // code is correct, allow user to reset password
      return res.status(200).json({ message: 'Code verified' });
    } else {
      // code is incorrect
      return res.status(400).json({ message: 'Invalid verification code' });
    }
  }
  else {
    return res.status(400).json({ message: 'Error' });
  }

});

// Forgot Password Screen 3 for customer
app.post('/forgot-password/password', async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ message: 'Missing required fields' });
  }


  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    // update password in database
    // const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email }, { password: hashedPassword }, { upsert: true });
    return res.status(200).json({ message: 'Password updated' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Logout API
app.put('/customer/logout', async (req, res) => {
  const { userId } = req.body;

  try {
    const seller = await User.findById(userId);

    if (!seller) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    seller.token = null;
    await seller.save();


    res.json({ message: 'Customer logged out successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update customer information
app.put('/updateCustomer/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    // Update Personal Info
    if (req.body.firstname || req.body.lastname || req.body.phonenumber || req.body.city || req.body.dateofbirth) {
      await User.updateOne({ _id: userId }, { $set: req.body });
    }

    res.status(200).json({ success: true, message: 'seller information updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/sellers/:type', async (req, res) => {
  const type = [req.params.type];
  console.log(type);
  try {
    const sellers = await Seller.find({ type: { $in: type } }).select('-password').exec();
    res.status(200).json({ sellers: sellers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


app.get("/customerOrders/:userId", async (req, res) => {
  const userId = req.params.userId;
  try {
    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    const orders = await Order.find({ userId: userId, status: { $nin: ["Completed", "Cancelled"] } })
      .populate('sellerId',
        '_id firstname lastname'
      );
    // populate the sellerId field with the name field of the Seller model

    res.status(200).json({ orders: orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});


app.put('/orders/:id/cancel', async (req, res) => {
  const orderId = req.params.id;
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    order.status = "Cancelled";
    await order.save();
    res.json({ message: "Order successfully cancelled" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get('/messagesList/:sellerId', async (req, res) => {
  try {
    const orders = await Order.find({ sellerId: req.params.sellerId, status: { $in: ['New', 'In Progress'] } }).populate('userId');
    const userIds = new Set(orders.map(order => order.userId));
    const sellerNames = [];
    for (const userId of userIds) {
      const userOrder = orders.find(order => order.userId === userId);
      sellerNames.push(`${userOrder.userId.firstname} ${userOrder.userId.lastname}`);
    }
    res.status(200).json({ sellerNames });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/orders/:orderId/rating', async (req, res) => {
  const { orderId } = req.params;
  const { rating } = req.body;

  // Check if rating is a number between 1 and 5
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Invalid rating value. Please enter a number between 1 and 5' });
  }

  try {
    // Find the order by ID
    const order = await Order.findById(orderId);

    // Check if order exists
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if order has already been rated
    if (order.rating) {
      return res.status(400).json({ error: 'Order has already been rated' });
    }

    // Update the order rating
    order.rating = rating;
    await order.save();

    // Find the seller associated with the order
    const seller = await Seller.findById(order.sellerId);

    // Check if seller exists
    if (!seller) {
      return res.status(500).json({ error: 'Unable to update seller rating. Seller not found' });
    }

    // Update the seller rating
    await seller.updateRating(rating);

    // Return success message
    return res.status(200).json({ message: 'Order rating updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Unable to update order rating' });
  }
});

app.put('/updateOrderAmount/:orderId/:updatedAmount', async (req, res) => {
  const { orderId } = req.params;
  const { updatedAmount } = req.params;
  try {
    // Find the order by ID
    const order = await Order.findById(orderId);
    // Check if order exists
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    // Update the unconfirmed amount of the order
    order.updatedAmount = updatedAmount;
    await order.save();
    return res.status(200).json({ message: 'Order amount updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});


// Create a POST endpoint for creating a transaction
app.post('/transactionsu', async (req, res) => {
  const { userId, date, amount, sellerid } = req.body;
  try {
    const user = await Seller.find({ sellerid });
    if (!user) {
      return res.status(404).json({ message: "Seller not found" })
    }

    // console.log(user.firstname);


    const transaction = new Transactionu({
      sellerid,
      userId,
      date,
      amount
    });
    await transaction.save();
    res.status(200).json({ message: "Transaction successfully created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get('/transactions/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const transactions = await Transactionu.find({ userId });
    const transactionData = await Promise.all(transactions.map(async transaction => {
      const seller = await Seller.findById(transaction.sellerid);
      return {
        date: transaction.date,
        amount: transaction.amount,
        sellername: seller.firstname + seller.lastname
      };
    }));
    res.status(200).json({ transactions: transactionData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post('/orders', upload.single('image'), async (req, res) => {
  const { username, userId, latitude, longitude, sellerId, type, date, day, time, image, amount, status, address } = req.body;
  try {
    const order = new Order({
      username,
      userId,
      sellerId,
      type,
      date,
      day,
      time,
      image,
      amount,
      status,
      address,
      latitude,
      longitude,
      timestamp: Date.now()
    });
    console.log(req.body);
    await order.save();
    res.status(200).json({ status: "Success", order: order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/sellerOrders/:sellerId', async (req, res) => {
  const sellerId = req.params.sellerId;
  try {
    const orders = await Order.find({ sellerId: sellerId, status: { $in: ["New", "In Progress"] } })
      .select("-__v");
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(200).json({ orders: orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});











