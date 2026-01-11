const mongoose = require("mongoose");
const RecommendationCacheSchema = require("./schema");

const RecommendationCache = mongoose.model(
  "RecommendationCache",
  RecommendationCacheSchema
);

module.exports = RecommendationCache;

