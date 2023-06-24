
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
    enum:['Electric+Heater','Plumber','Cooling'],
    required : true
  },
  token: {
    type: String,
    // required : true
  },
  imagename: {
    type: String,
    required : true
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
  storedCode: { type: Number },
  rating: {
    type: Number,
    default: 0,
  },
  earnings: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

sellerinfo.methods.updateRating = function(rating) {
  const numRatings = this.orders.length;
  const currentRating = this.rating;
  const newRating = (currentRating * numRatings + rating) / (numRatings + 1);
  this.rating = newRating;
  return this.save();
};

const Seller = mongo.model("sellerinfo", sellerinfo);

module.exports = Seller;
