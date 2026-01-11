const mongoose = require("mongoose");
const returnRequestSchema = require("./schema");

const ReturnRequest = mongoose.model("ReturnRequest", returnRequestSchema);

module.exports = ReturnRequest;
