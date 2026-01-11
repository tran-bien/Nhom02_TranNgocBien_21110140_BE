const mongoose = require("mongoose");
const LoyaltyTransactionSchema = require("./schema");

const LoyaltyTransaction = mongoose.model(
  "LoyaltyTransaction",
  LoyaltyTransactionSchema
);

module.exports = LoyaltyTransaction;

