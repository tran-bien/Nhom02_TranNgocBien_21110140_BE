const mongoose = require("mongoose");
const CouponSchema = require("./schema");
const { applyMiddlewares } = require("./middlewares");

// Áp dụng middlewares
applyMiddlewares(CouponSchema);

// Tạo model
const Coupon = mongoose.model("Coupon", CouponSchema);

module.exports = Coupon;
