
const mongo = require("mongoose");

const adminInfo = new mongo.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
   
  password: {
    type: String,
    required: true,
  },

}, {
  timestamps: true,
});


module.exports  = mongo.model("adminInfo", adminInfo);
