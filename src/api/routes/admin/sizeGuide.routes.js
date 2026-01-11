const express = require("express");
const router = express.Router();
const sizeGuideController = require("@controllers/admin/sizeGuide.controller");
const {
  protect,
  requireStaffOrAdmin,
} = require("@middlewares/auth.middleware");
const sizeGuideValidator = require("@validators/sizeGuide.validator");
const validate = require("@utils/validatehelper");

router.use(protect);
router.use(requireStaffOrAdmin);

/**
 * @route GET /api/admin/size-guides
 * @desc Lấy danh sách size guides
 */
router.get("/", sizeGuideController.getAllSizeGuides);

/**
 * @route GET /api/admin/size-guides/:id
 * @desc Lấy chi tiết size guide
 */
router.get(
  "/:id",
  validate(sizeGuideValidator.validateSizeGuideId),
  sizeGuideController.getSizeGuideById
);

/**
 * @route POST /api/admin/size-guides
 * @desc Tạo size guide mới
 */
router.post(
  "/",
  validate(sizeGuideValidator.validateCreateSizeGuide),
  sizeGuideController.createSizeGuide
);

/**
 * @route PUT /api/admin/size-guides/:id
 * @desc Cập nhật size guide
 */
router.put(
  "/:id",
  validate([
    sizeGuideValidator.validateSizeGuideId,
    sizeGuideValidator.validateUpdateSizeGuide,
  ]),
  sizeGuideController.updateSizeGuide
);

/**
 * @route DELETE /api/admin/size-guides/:id
 * @desc Xóa size guide
 */
router.delete(
  "/:id",
  validate(sizeGuideValidator.validateSizeGuideId),
  sizeGuideController.deleteSizeGuide
);

module.exports = router;
