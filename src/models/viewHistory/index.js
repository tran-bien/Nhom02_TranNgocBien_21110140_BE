const mongoose = require("mongoose");
const ViewHistorySchema = require("./schema");

const ViewHistory = mongoose.model("ViewHistory", ViewHistorySchema);

module.exports = ViewHistory;

