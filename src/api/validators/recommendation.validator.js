const { query } = require("express-validator");

const recommendationValidator = {
  // Validate get recommendations query
  validateRecommendationsQuery: [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Giới hạn phải là số nguyên từ 1-50"),
  ],
};

module.exports = recommendationValidator;
