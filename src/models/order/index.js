const mongoose = require("mongoose");
const OrderSchema = require("./schema");
const { applyMiddlewares } = require("./middlewares");

// Áp dụng middlewares
applyMiddlewares(OrderSchema);

// Tạo model
const Order = mongoose.model("Order", OrderSchema);

module.exports = Order;
