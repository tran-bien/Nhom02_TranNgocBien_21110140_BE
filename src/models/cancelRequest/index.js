const mongoose = require("mongoose");
const CancelRequestSchema = require("./schema");
const { applyMiddlewares } = require("./middlewares");

// Áp dụng middlewares
applyMiddlewares(CancelRequestSchema);

// Tạo model
const CancelRequest = mongoose.model("CancelRequest", CancelRequestSchema);

module.exports = CancelRequest;
