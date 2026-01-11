const mongoose = require("mongoose");
const UserSchema = require("./schema");
const { applyMiddlewares } = require("./middlewares");

// Áp dụng middlewares
applyMiddlewares(UserSchema);
// Tạo model
const User = mongoose.model("User", UserSchema);

module.exports = User;
