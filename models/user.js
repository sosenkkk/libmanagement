const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
 
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  resetToken: String,
  resetTokenExpiration: Date, 
  wishlist: {
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true },
      },
    ],
  },
});

userSchema.methods.addToCart = function (product) {
  const cartProductIndex = this.wishlist.items.findIndex((cp) => {
    return cp.productId.toString() === product._id.toString();
  });
  let newQuantity = 1;
  const updatedCartItems = [...this.wishlist.items];
  if (cartProductIndex >= 0) {
    newQuantity = this.wishlist.items[cartProductIndex].quantity + 1;
    updatedCartItems[cartProductIndex].quantity = newQuantity;
  } else {
    updatedCartItems.push({
      productId: product._id,
      quantity: newQuantity,
    });
  }

  const updatedCart = {
    items: updatedCartItems,
  };
  this.wishlist = updatedCart;
  return this.save();
};

userSchema.methods.getCart = function () {
  const productIds = this.wishlist.items.map((i) => {
    return i.productId;
  });

  return db
    .collection("products")
    .find({ _id: { $in: productIds } })
    .toArray()
    .then((products) => {
      return products.map((p) => {
        return {
          ...p,
          quantity: this.wishlist.items.find((i) => {
            return i.productId.toString() === p._id.toString();
          }).quantity,
        };
      });
    });
};

userSchema.methods.removeFromCart = function (id) {
  const updatedCartItems = this.wishlist.items.filter((item) => {
    console.log(id)
    return item._id.toString() !== id.toString();
  });

  this.wishlist.items = updatedCartItems;
  return this.save();
};

userSchema.methods.clearCart= function(){
  this.wishlist= { items: []};
  return this.save();
}

module.exports = mongoose.model("User", userSchema);
