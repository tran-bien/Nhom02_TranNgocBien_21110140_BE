const express = require("express");
const router = express.Router();
const loyaltyTierController = require("@controllers/admin/loyaltyTier.controller");
const {
  protect,
  requireStaffOrAdmin,
} = require("@middlewares/auth.middleware");
const loyaltyTierValidator = require("@validators/loyaltyTier.validator");
const validate = require("@utils/validatehelper");

// Áp dụng middleware protect cho tất cả routes
router.use(protect);

/**
 * @route GET /api/admin/loyalty-tiers
 * @desc Lấy danh sách loyalty tiers
 * @access Staff/Admin
 */
router.get(
  "/",
  requireStaffOrAdmin,
  validate(loyaltyTierValidator.validateGetTiers),
  loyaltyTierController.getAllTiers
);

/**
 * @route GET /api/admin/loyalty-tiers/:id
 * @desc Lấy chi tiết loyalty tier
 * @access Staff/Admin
 */
router.get(
  "/:id",
  requireStaffOrAdmin,
  validate(loyaltyTierValidator.validateTierId),
  loyaltyTierController.getTierById
);

/**
 * @route POST /api/admin/loyalty-tiers
 * @desc Tạo loyalty tier mới
 * @access Admin
 */
router.post(
  "/",
  requireStaffOrAdmin,
  validate(loyaltyTierValidator.validateCreateTier),
  loyaltyTierController.createTier
);

/**
 * @route PUT /api/admin/loyalty-tiers/:id
 * @desc Cập nhật loyalty tier
 * @access Admin
 */
router.put(
  "/:id",
  requireStaffOrAdmin,
  validate(loyaltyTierValidator.validateUpdateTier),
  loyaltyTierController.updateTier
);

/**
 * @route DELETE /api/admin/loyalty-tiers/:id
 * @desc Xóa loyalty tier
 * @access Admin
 */
router.delete(
  "/:id",
  requireStaffOrAdmin,
  validate(loyaltyTierValidator.validateTierId),
  loyaltyTierController.deleteTier
);

module.exports = router;
