const Product = require("../models/product");
const Issue = require("../models/issued");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;
  let price;
  Product.find()
    .countDocuments()
    .then((numProducts) => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * itemsPerPage)
        .limit(itemsPerPage);
    })
    .then((products) => {
      res.render("shop/product-list", {
        prods: products,
        pageTitle: "All Products",
        path: "/products",
        currentPage: +page,
        hasNextPage: itemsPerPage * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: +page + 1,
        previousPage: +page - 1,
        lastPage: Math.ceil(totalItems / itemsPerPage),
      });
    })
    .catch((err) => console.log(err));
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

const itemsPerPage = 3;
exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;
  let price;
  Product.find()
    .countDocuments()
    .then((numProducts) => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * itemsPerPage)
        .limit(itemsPerPage);
    })
    .then((products) => {
      res.render("shop/index", {
        prods: products,
        pageTitle: "All Products",
        path: "/",
        currentPage: +page,
        hasNextPage: itemsPerPage * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: +page + 1,
        previousPage: +page - 1,
        lastPage: Math.ceil(totalItems / itemsPerPage),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate("wishlist.items.productId")
    .then((user) => {
      const products = user.wishlist.items;
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Wishlist",
        products: products,
      });
    })
    .catch((err) => {
      next(err);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      console.log(result);
      res.redirect("/cart");
    });
};
exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;

  req.user
    .removeFromCart(prodId)
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  Issue.find({ "user.userId": req.user._id })
    .then((issue) => {
      console.log(issue);
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Books Issued",
        issue: issue,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
  req.user
    .populate("wishlist.items.productId")
    .then((user) => {
      const products = user.wishlist.items;
      let totalPrice = 0;
      products.forEach((p) => {
        totalPrice += p.quantity;
      });
      res.render("shop/checkout", {
        path: "/checkout",
        pageTitle: "Checkout",
        products: products,
        totalSum: totalPrice,
      });
    })
    .catch((err) => {
      next(err);
    });
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate("wishlist.items.productId")
    .then((user) => {
      const products = user.wishlist.items.map((i) => {
        return { quantity: i.quantity, book: { ...i.productId._doc } };
      });
      const issue = new Issue({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        books: products,
      });
      return issue.save();
    })
    .then(() => {
      req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  console.log(orderId);

  Issue.findById(orderId)
    .then((order) => {
      if (!order) {
        return next(new Error("No such order"));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error("Unauthorised User"));
      }
      const invoiceName = "invoice-" + orderId + ".pdf";
      const invoicePath = path.join("data", "invoices", invoiceName);
      const pdfDoc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="' + invoiceName + '"'
      );
      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text("Invoice", {
        underline: true,
      });
      pdfDoc.text("----------------------------");
      let total = 0;
      order.products.forEach((prod) => {
        total = total + prod.quantity;

        pdfDoc.fontSize(14).text(prod.product.title + " - " + prod.quantity);
      });
      pdfDoc.text("Total Books Issued : " + total);
      pdfDoc.text("----------------------------");
      pdfDoc.end();
    })
    .catch((err) => next(err));
};
