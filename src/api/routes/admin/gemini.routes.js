const express = require("express");
const router = express.Router();
const geminiController = require("@controllers/admin/gemini.controller");
const { protect, requireStaffOrAdmin } = require("@middlewares/auth.middleware");
const validateRequest = require("@middlewares/validateRequest");
const { validateToggleDemoMode } = require("@validators/gemini.validator");

/**
 * Tất cả routes cần auth Admin/Staff
 */
router.use(protect);
router.use(requireStaffOrAdmin);

/**
 * @route   POST /api/v1/admin/gemini/demo-mode
 * @desc    Toggle Demo Mode
 * @access  Admin/Staff
 */
router.post(
  "/demo-mode",
  validateToggleDemoMode,
  validateRequest,
  geminiController.toggleDemoMode
);

/**
 * @route   GET /api/v1/admin/gemini/demo-mode
 * @desc    Get Demo Mode status
 * @access  Admin/Staff
 */
router.get("/demo-mode", geminiController.getDemoMode);

module.exports = router;
