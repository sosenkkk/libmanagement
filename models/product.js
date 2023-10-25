const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const productSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  copies: {
    type: Number,
    required: true
  },
  description: {
    type: String,
  },
  author:{
    type:String,
    required:true
  }
});

module.exports = mongoose.model('Product', productSchema);