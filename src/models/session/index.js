const mongoose = require("mongoose");
const SessionSchema = require("./schema");

// Tạo model
const Session = mongoose.model("Session", SessionSchema);

module.exports = Session;
