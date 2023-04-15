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
      email: {
        type: String,
        required: true,
        unique: true,
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


const User = mongoose.model("User" , userInfo);
module.exports = User;