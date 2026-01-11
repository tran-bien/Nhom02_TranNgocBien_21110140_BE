const express = require("express");
const router = express.Router();
const recommendationController = require("@controllers/user/recommendation.controller");
const { protect } = require("@middlewares/auth.middleware");
const recommendationValidator = require("@validators/recommendation.validator");
const validate = require("@utils/validatehelper");

router.use(protect);

/**
 * @route GET /api/users/recommendations
 * @desc Lấy sản phẩm đề xuất cá nhân hóa
 * @query algorithm=HYBRID|COLLABORATIVE|CONTENT_BASED|TRENDING
 */
router.get(
  "/",
  validate(recommendationValidator.validateRecommendationsQuery),
  recommendationController.getRecommendations
);

module.exports = router;
