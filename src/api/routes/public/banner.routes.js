const express = require("express");
const router = express.Router();
const bannerController = require("@controllers/public/banner.controller");

/**
 * @route GET /api/banners
 * @desc Lấy danh sách banner công khai (chỉ active)
 * @access Public
 */
router.get("/", bannerController.getPublicBanners);

module.exports = router;
