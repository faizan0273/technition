
const mongo = require("mongoose");

const sellerinfo = new mongo.Schema({
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
  type : {
    type :String,
    enum:['Electric','Plumber','Cooling','Heater'],
    required : false
  },
  token: {
    type: String,
    // required : true
  },
  passportDocument: {
    type: Buffer,
    // required : true
  },
  trainingDocument: {
    type: Buffer,
    // required : true
  },
  healthDocument: {
    type: Buffer,
    // required : true
  },
  storedCode: { type: Number }
}, {
  timestamps: true,
});

const Seller = mongo.model("sellerinfo", sellerinfo);

module.exports = Seller;
