const mongoose = require("mongoose");
const UserBehaviorSchema = require("./schema");

const UserBehavior = mongoose.model("UserBehavior", UserBehaviorSchema);

module.exports = UserBehavior;

