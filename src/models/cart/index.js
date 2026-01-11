const mongoose = require("mongoose");
const CartSchema = require("./schema");
const { applyMiddlewares } = require("./middlewares");

// Áp dụng middlewares - FIX: applyMiddlewares không nhận param
applyMiddlewares();

// Tạo model
const Cart = mongoose.model("Cart", CartSchema);

module.exports = Cart;
