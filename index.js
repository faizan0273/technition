
const bcrypt = require("bcrypt");
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
app.use(bodyParser.json());
const nodemailer = require('./node_modules/nodemailer');
const sellerAuthMiddleware = require('./authMiddleware');
const axios = require('axios');
const User = require("./Schema/user");
const Order = require("./Schema/order");
const Seller = require("./Schema/SellerInfo");
const Wallet = require("./Schema/wallet");
const Transaction = require("./Schema/transaction");
const cors = require("cors");
app.use(cors());


mongoose.connect('mongodb+srv://inzmam56:aohnpy5ApZ2SgwhP@cluster0.lprxxnp.mongodb.net/technician?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));


  app.get('/', function (req, res) {
    res.json({ message: 'PakistanZindabad989' });

  });

  


  async function getAddressFromCoordinates(lat, lon) {
    console.log(typeof lat);
    console.log(typeof lon);
    try {
        const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
            headers: {
              'accept-language': 'en-US'
            }
          });
      const { address } = response.data;
      console.log(response.data);
      return address;
    } catch (error) {
      console.error(error);
      return 'Unable to get address from coordinates';
    }
  }
  
  



// Signup API
app.post("/signup", async (req, res) => {
    console.log(req.body);
  const {
    firstname,
    lastname,
    email,
    password,
    phonenumber,
    city,
    dateofbirth,
  } = req.body;

  const userExists = await Seller.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Hash the password before storing in the database
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const seller = new Seller({
      firstname,
      lastname,
      email,
      password: hashedPassword,
      phonenumber,
      city,
      dateofbirth,
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
  const { email, password } = req.body;

  try {
    const seller = await Seller.findOne({ email });

    if (!seller) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user_ = await Seller.findOne({ email, token: { $ne: null } });
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
      return res.status(400).json({message:'Missing required fields'});
    }
  
    try {
      const user = await Seller.findOne({ email });
      if (!user) {
        return res.status(400).json({message:'User not found'});
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
      return res.status(500).json({error:err.message});
    }
    return res.status(200).json({message:"Code sent to email"});
  });
      
    } catch (err) {
      return res.status(500).json({error:err.message});
    }
  });
  
  // Forgot Password Screen 2 for customer
  app.post('/forgot-passwordc/code', async (req, res) => {
      const { email, code } = req.body;
    
      if (!email || !code) {
        return res.status(400).json({message:'Missing required fields'});
      }
    
      // retrieve storedCode from your database using the email address
      const user = await Seller.findOne({ email });
      if(user){
        const storedCode = user.storedCode;
  
        if (code == storedCode) {
          // code is correct, allow user to reset password
          return res.status(200).json({message:'Code verified'});
        } else {
          // code is incorrect
          return res.status(400).json({message:'Invalid verification code'});
        }
      }
      else{
        return res.status(400).json({message:'Error'});
      }

    });
    
  // Forgot Password Screen 3 for customer
  app.post('/forgot-passwordc/password', async (req, res) => {
      const { email, newPassword } = req.body;
      
      if (!email || !newPassword) {
        return res.status(400).json({message:'Missing required fields'});
      }
    
      try {
        const user = await Seller.findOne({ email });
        if (!user) {
          return res.status(400).json({message:'User not found'});
        }
        // update password in database
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await Seller.findOneAndUpdate({ email }, { password: hashedPassword }, { upsert: true });  
        return res.status(200).json({message:'Password updated'});
      } catch (err) {
        return res.status(500).json({error:err.message});
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
app.put('/seller/update-documents',sellerAuthMiddleware, upload.fields([{ name: 'passportDocument', maxCount: 1 }, { name: 'trainingDocument', maxCount: 1 }, { name: 'healthDocument', maxCount: 1 }]), async (req, res) => {
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
app.get('/seller/:sellerId',sellerAuthMiddleware, async (req, res) => {
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
  
    try {
      const seller = await Seller.findById(sellerId);
  
      if (!seller) {
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
app.put('/updateseller/:sellerId',sellerAuthMiddleware, async (req, res) => {
    const sellerId = req.params.sellerId;
  
    try {
      // Update Personal Info
      if (req.body.firstname || req.body.lastname || req.body.email || req.body.phonenumber || req.body.city || req.body.dateofbirth ) {
        await Seller.updateOne({ _id:sellerId }, { $set: req.body });
      }
  
      res.status(200).json({ success: true, message: 'seller information updated successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error:err.message });
    }
  });
  
  // Add seller amount to wallet
  app.post('/wallet', async (req, res) => {
    try {
      const { seller, amount } = req.body;
  
      // Check if a wallet exists for the seller
      let wallet = await Wallet.findOne({ seller });
  
      if (!wallet) {
        // If a wallet does not exist, create a new one with the initial balance
        wallet = new Wallet({ seller, balance: amount });
        await wallet.save();
      } else {
        // If a wallet exists, add the new amount to the existing balance
        wallet.balance += Number(amount);
        await wallet.save();
      }
  
      res.status(200).json({message:"Amount added to seller wallet"});
    } catch (error) {
      res.status(500).json({ error:error.message });
    }
  });
  
  
  //transactions of seller from their wallet
  
  app.post('/transactions',sellerAuthMiddleware, async (req, res) => {
    try {
      const { seller, amount, method } = req.body;
  
      // Check if a wallet exists for the seller
      let wallet = await Wallet.findOne({ seller:seller });
  
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
  
      res.status(200).json({message:savedTransaction});
    } catch (error) {
      res.status(500).json({ error:error.message });
    }
  });
  
  //get amount of seller wallet
  
  app.get('/wallet/:sellerId',sellerAuthMiddleware, async (req, res) => {
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
      res.status(500).json({ error:error.message });
    }
  });
  
  //return all transactions of seller
  app.get('/getransactions/:sellerId',sellerAuthMiddleware, async (req, res) => {
    try {
      const sellerId = req.params.sellerId;
  
      // Find all transactions of the seller by querying the Transaction model
      const transactions = await Transaction.find({ seller: sellerId }).select('-__v -updatedAt ');
  
      // Return the transactions as a response
      res.status(200).json({message:transactions});
    } catch (error) {
      res.status(500).json({ error:error.message });
    }
  });

  app.get('/location/:lon/:lat', async (req, res) => {
    try {
      const lon = Number(req.params.lon);
      const lat = Number(req.params.lat);
      const result= getAddressFromCoordinates(Number(lat),Number(lon));
      res.status(200).json({location: result});
    } catch (error) {
      res.status(500).json({ error:error.message });
    }
  });

  app.get('/sellerOrders/:sellerId', async (req, res) => {
    const sellerId = req.params.sellerId;
    try {
      const orders = await Order.find({ sellerId: sellerId, status: { $in: ["New", "In Progress"] }})
        .select("-__v"); 
      res.status(200).json({ orders: orders });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
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
      res.json({ message: "Order successfully completed" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  


// start the server
const port = process.env.PORT || 8000;
app.listen(port, () => {
    // getAddressFromCoordinates(31.454633,74.300076);
    console.log(`Server listening on port ${port}`)
});
  




//Custumor APIs


app.post('/costumersignup', async (req, res) => {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: req.body.email });
      if (existingUser) {
        return res.status(409).json({ message: 'User already exists' });
      }
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
  
      // Create the user
      const user = new User({
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        password: hashedPassword,
        phonenumber: req.body.phonenumber,
        city: req.body.city,
        dateofbirth: req.body.dateofbirth,
      });
      const savedUser = await user.save();
  
      res.status(200).json({ message: 'User created successfully', user: savedUser });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/costumersignin', async (req, res) => {
    try {
        const email= req.body.email;
      // Check if user exists
      const user = await User.findOne({ email: req.body.email });
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const user_ = await User.findOne({ email, token: { $ne: null } });
      if (user_) {
        return res.status(400).json({ message: 'User is already logged in' });
      }
  
      // Check password
      const validPassword = await bcrypt.compare(req.body.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid Password' });
      }
  
      // Create and return the JWT token
      const token = jwt.sign({ userId: user._id }, 'mysecretkey');
      user.token = token;
      await user.save();
      res.json({ message: 'Authentication successful', token: token ,id : user._id});
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
      return res.status(400).json({message:'Missing required fields'});
    }
  
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({message:'User not found'});
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
      return res.status(500).json({error:err.message});
    }
    return res.status(200).json({message:"Code sent to email"});
  });
      
    } catch (err) {
      return res.status(500).json({error:err.message});
    }
  });
  
  // Forgot Password Screen 2 for customer
  app.post('/forgot-password/code', async (req, res) => {
      const { email, code } = req.body;
    
      if (!email || !code) {
        return res.status(400).json({message:'Missing required fields'});
      }
    
      // retrieve storedCode from your database using the email address
      const user = await User.findOne({ email });
      if(user){
        const storedCode = user.storedCode;
  
        if (code == storedCode) {
          // code is correct, allow user to reset password
          return res.status(200).json({message:'Code verified'});
        } else {
          // code is incorrect
          return res.status(400).json({message:'Invalid verification code'});
        }
      }
      else{
        return res.status(400).json({message:'Error'});
      }

    });
    
  // Forgot Password Screen 3 for customer
  app.post('/forgot-password/password', async (req, res) => {
      const { email, newPassword } = req.body;
      
      if (!email || !newPassword) {
        return res.status(400).json({message:'Missing required fields'});
      }

    
      try {
        const user = await User.findOne({ email });
        if (!user) {
          return res.status(400).json({message:'User not found'});
        }
        // update password in database
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findOneAndUpdate({ email }, { password: hashedPassword }, { upsert: true });  
        return res.status(200).json({message:'Password updated'});
      } catch (err) {
        return res.status(500).json({error:err.message});
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

    // Update seller information
app.put('/updateCustomer/:userId', async (req, res) => {
    const userId = req.params.userId;
  
    try {
      // Update Personal Info
      if (req.body.firstname || req.body.lastname || req.body.email || req.body.phonenumber || req.body.city || req.body.dateofbirth ) {
        await User.updateOne({ _id:userId }, { $set: req.body });
      }
  
      res.status(200).json({ success: true, message: 'seller information updated successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error:err.message });
    }
  });

  app.get('/sellers/:type', async (req, res) => {
    const type = req.params.type; // retrieve type from query parameter
  
    try {
      const sellers = await Seller.find({ type: type }).exec();
      res.status(200).json({sellers:sellers});
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });


  app.post('/orders', async (req, res) => {
    const { username,userId, sellerId, type, date, day, time, image, amount, status, lat,lon } = req.body;
  
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
        lat,
        lon,
        timestamp: Date.now()
      });
      await order.save();
      res.status(200).json({status:"Success", order: order});
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
        const orders = await Order.find({ userId: userId, status: { $nin: ["Completed", "Cancelled"] } });

      res.status(200).json({orders:orders});
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
  


