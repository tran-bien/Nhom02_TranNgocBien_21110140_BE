const express = require("express");
const router = express.Router();
const loyaltyController = require("@controllers/user/loyalty.controller");
const { protect } = require("@middlewares/auth.middleware");
const loyaltyValidator = require("@validators/loyalty.validator");
const validate = require("@utils/validatehelper");

router.use(protect);

/**
 * @route GET /api/users/loyalty/stats
 * @desc Lấy thống kê loyalty
 */
router.get("/stats", loyaltyController.getLoyaltyStats);

/**
 * @route GET /api/users/loyalty/tiers
 * @desc Lấy danh sách các tier loyalty (cho user xem)
 */
router.get("/tiers", loyaltyController.getTiers);

/**
 * @route GET /api/users/loyalty/transactions
 * @desc Lấy lịch sử giao dịch điểm
 */
router.get(
  "/transactions",
  validate(loyaltyValidator.validateTransactionsQuery),
  loyaltyController.getTransactions
);

module.exports = router;
