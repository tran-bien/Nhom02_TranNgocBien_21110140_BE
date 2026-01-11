const mongoose = require("mongoose");
const LoyaltyTierSchema = require("./schema");

const LoyaltyTier = mongoose.model("LoyaltyTier", LoyaltyTierSchema);

module.exports = LoyaltyTier;

