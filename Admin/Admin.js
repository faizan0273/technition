const adminInfo = require("../Schema/admin.js")
const order = require("../Schema/order.js")
const sellerinfo = require("../Schema/SellerInfo.js")
const userInfo = require("../Schema/user.js")

 
const adminController = {
    async adminSignUp(req, res){
        console.log(1)
        try {
        console.log(2)
          const {
            name,
            email,
            password
          } = req.body;
          const checkExists = await adminInfo.findOne({ email });
          if (checkExists) {
        console.log(5)
            return res.status(400).json({ message: 'Admin with the provided email already exists' });
          }
          const newAdmin = await adminInfo.create({
            name,
            email,
            password,
          });
          console.log(6)
      
          return res.status(200).json({ message: 'Admin Created', id: newAdmin._id });
        } catch (error) {
          console.error(error);
          return res.status(500).json({ error: 'An error occurred during doctor sign-up' });
        }
      },

     async updateAdmin(req,res){
        const userId = req.params.userId;
        try {
          // Update Personal Info
          if (req.body.name || req.body.email || req.body.password  ) {
            await adminInfo.updateOne({ _id:userId }, { $set: req.body });
          }
      
          res.status(200).json({ success: true, message: 'seller information updated successfully' });
        } catch (err) {
          console.error(err);
          res.status(500).json({ error:err.message });
        }
      },
      async  adminlogin(req, res) {
        try {
          const { email, password } = req.body;
      
          if (!email || !password) {
            return res.status(400).json({ error: 'Required Fields are not given' });
          }
      
          const admin = await adminInfo.findOne({ email });
      
          if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
          }
      
          if (admin.password !== password) {
            return res.status(401).json({ error: 'Invalid password' });
          }
      
          return res.status(200).json({ message: 'Login successful', id: admin._id });
        } catch (error) {
          console.error('Error during login:', error);
          return res.status(500).json({ error: 'An error occurred during login' });
        }
      },
      async AdminLogout(req, res) {
        const { adminId } = req.params;
        try {
            const Admin = await adminInfo.findById(adminId);
        
            if (!Admin) {
              return res.status(404).json({ error: 'Admin not found' });
            }
            res.json({ message: 'Admin logged out successfully' });
          } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Server error' });
          }
      
    
      },
      async AdminGetInfo(req, res) {
        const { adminId } = req.params;
        try {
            const Admin = await adminInfo.findById(adminId);
        
            if (!Admin) {
              return res.status(404).json({ error: 'Admin not found' });
            }
            res.json({ Admin: Admin });
          } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Server error' });
          }
      },
      async  getAllOrders(req, res) {
        try {
          const allOrders = await order.find();
      
          if (!allOrders) {
            return res.status(404).json({ error: 'There are no Orders' });
          }  
          return res.status(200).json({ allOrders: allOrders, });
        } catch (error) {
          console.error('Error during login:', error);
          return res.status(500).json({ error: 'An error occurred during login' });
        }
      },
      async  getAllVendors(req, res) {
        try {
        
          const vendor = await sellerinfo.find();
      
          if (!vendor) {
            return res.status(404).json({ error: 'There are no vendor' });
          }
      
        
      
          return res.status(200).json({ vendor: vendor, });
        } catch (error) {
          console.error('Error during login:', error);
          return res.status(500).json({ error: 'An error occurred during login' });
        }
      },

      async changeAccessVendor(req, res) {
        try {
          const { sellerid } = req.params;
          const vendor = await sellerinfo.findById(sellerid);
      
          if (!vendor) {
            return res.status(404).json({ error: 'Vendor does not exist' });
          }
      
          // Toggle the 'access' field between 'Accepted' and 'Denied'
          if (vendor.access === 'Denied') {
            vendor.access = 'Accepted';
          } else {
            vendor.access = 'Denied';
          }
      
          await vendor.save(); // Save the updated document
      
          return res.status(200).json({ message: `Vendor Access ${vendor.access} Successfully` });

        } catch (error) {
          console.error('Error during updating vendor access:', error);
          return res.status(500).json({ error: 'An error occurred while updating vendor access' });
        }
      },
      
      async  getallUsers(req, res) {
        try {
        
          const User = await userInfo.find();
      
          if (!User) {
            return res.status(404).json({ error: 'There are no Users' });
          }   
        
      
          return res.status(200).json({ User: User, });
        } catch (error) {
          console.error('Error during login:', error);
          return res.status(500).json({ error: 'An error occurred during login' });
        }
      },
      async changeAccessUser(req, res) {
        try {
          const { userId } = req.params;
          const User = await userInfo.findById(userId);
      
          if (!User) {
            return res.status(404).json({ error: 'User does not exist' });
          }
      
          if (User.access === 'Denied') {
            User.access = 'Accepted';
          } else {
            User.access = 'Denied';
          }
          await User.save(); // Save the updated document
      
          return res.status(200).json({ message: `User Access ${User.access} Successfully` });

        } catch (error) {
          console.error('Error during blocking vendor:', error);
          return res.status(500).json({ error: 'An error occurred while blocking the vendor' });
        }
      },

      async getAllBlockedVendors(req, res) {
        try {
            const Vendor = await sellerinfo.find({ access: "Denied" });
          if (!Vendor) {
            return res.status(404).json({ error: 'User does not exist' });
          }
          return res.status(200).json({ Vendor: Vendor});

        } catch (error) {
          console.error('Error during blocking vendor:', error);
          return res.status(500).json({ error: 'An error occurred while blocking the vendor' });
        }
      },
      
      async getAllBlockedUsers(req, res) {
        try {
            const User = await userInfo.find({ access: "Denied" });
          if (!User) {
            return res.status(404).json({ error: 'User does not exist' });
          }
          return res.status(200).json({ User: User});

        } catch (error) {
          console.error('Error during blocking vendor:', error);
          return res.status(500).json({ error: 'An error occurred while blocking the vendor' });
        }
      },


}


module.exports = adminController;


