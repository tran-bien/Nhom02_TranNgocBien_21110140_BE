const express = require("express");
const router = express.Router();
const viewHistoryController = require("@controllers/user/viewHistory.controller");
const { protect, optionalAuth } = require("@middlewares/auth.middleware");
const viewHistoryValidator = require("@validators/viewHistory.validator");
const validate = require("@utils/validatehelper");

/**
 * @route POST /api/users/view-history
 * @desc Track product view (không bắt buộc login, nhưng lấy user nếu có token)
 */
router.post(
  "/",
  optionalAuth, // FIX: Lấy user nếu có token để lưu đúng userId
  validate(viewHistoryValidator.validateTrackView),
  viewHistoryController.trackView
);

// Protected routes
router.use(protect);

/**
 * @route GET /api/users/view-history
 * @desc Lấy lịch sử xem
 */
router.get(
  "/",
  validate(viewHistoryValidator.validateHistoryQuery),
  viewHistoryController.getHistory
);

/**
 * @route DELETE /api/users/view-history
 * @desc Xóa lịch sử
 */
router.delete("/", viewHistoryController.clearHistory);

module.exports = router;
