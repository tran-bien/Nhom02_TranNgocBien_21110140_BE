const express = require("express");
const router = express.Router();
const bannerController = require("@controllers/admin/banner.controller");
const {
  protect,
  requireStaffOrAdmin,
} = require("@middlewares/auth.middleware");
const validate = require("@utils/validatehelper");
const {
  validateBannerId,
  validateUpdateBanner,
} = require("@validators/banner.validator");

// Áp dụng middleware protect cho tất cả routes
router.use(protect);
router.use(requireStaffOrAdmin);

/**
 * @route GET /api/admin/banners
 * @desc Lấy danh sách banner với phân trang và filter
 * @access Staff/Admin
 */
router.get("/", bannerController.getAllBanners);

/**
 * @route GET /api/admin/banners/:id
 * @desc Lấy chi tiết banner theo ID
 * @access Staff/Admin
 */
router.get("/:id", validate(validateBannerId), bannerController.getBannerById);

/**
 * @route PUT /api/admin/banners/:id
 * @desc Cập nhật thông tin banner (không bao gồm ảnh)
 * @access Staff/Admin
 */
router.put(
  "/:id",
  validate([validateBannerId, validateUpdateBanner]),
  bannerController.updateBanner
);

/**
 * @route PUT /api/admin/banners/:id/restore
 * @desc Khôi phục banner đã xóa
 * @access Staff/Admin
 */
router.put(
  "/:id/restore",
  validate(validateBannerId),
  bannerController.restoreBanner
);

/**
 * @route PUT /api/admin/banners/:id/toggle-status
 * @desc Toggle trạng thái active của banner
 * @access Staff/Admin
 */
router.put(
  "/:id/toggle-status",
  validate(validateBannerId),
  bannerController.toggleBannerStatus
);

module.exports = router;
