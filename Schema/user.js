const mongoose = require("mongoose");

const userInfo  = new mongoose.Schema({
    firstname: {
        type: String,
        required: true,
      },
      lastname: {
        type: String,
        required: true,
      },
      password: {
        type: String,
        required: true,
      },
      phonenumber: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      dateofbirth: {
        type: String,
        required: false,
      },
      access: {
        type: String,
        enum: ['Accepted', 'Denied'],
        default : "Accepted"
      },  
      idofiqama: {
        type: String,
        required: false,
      },
      storedCode: { type: Number },
      token: {
        type: String,
        // required : true
      },},
      {
        timestamps: true,
      });


const User = mongoose.model("Users" , userInfo);
module.exports = User;