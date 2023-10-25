const adminController = require("../Admin/Admin")
const express= require('express');

const router=express.Router();

router.post('/adminSignUp' , adminController.adminSignUp);

router.post('/adminLogin' , adminController.adminlogin);

router.post('/updateAdmin/:' , adminController.updateAdmin);

router.get('/getAllOrders' , adminController.getAllOrders);

router.get('/getAllVendors' , adminController.getAllVendors);

router.post('/changeAccessVendor/:sellerid' , adminController.changeAccessVendor);

router.get('/getallUsers' , adminController.getallUsers);

router.post('/changeAccessUser/:userId' , adminController.changeAccessUser);

router.get('/getAllBlockedVendors' , adminController.getAllBlockedVendors);

router.get('/getAllBlockedUsers' , adminController.getAllBlockedUsers);

router.get('/AdminLogout/:adminId' , adminController.AdminLogout);

router.get('/AdminGetInfo/:adminId' , adminController.AdminGetInfo);


module.exports=router;