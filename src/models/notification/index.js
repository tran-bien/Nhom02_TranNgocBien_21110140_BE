const mongoose = require("mongoose");
const NotificationSchema = require("./schema");

const Notification = mongoose.model("Notification", NotificationSchema);

module.exports = Notification;

