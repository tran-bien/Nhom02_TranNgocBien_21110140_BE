const express = require("express");
const {
  protect,
  requireStaffOrAdmin,
} = require("@middlewares/auth.middleware");
const imageController = require("@controllers/admin/image.controller");
const uploadMiddleware = require("@middlewares/upload.middleware");
const uploadValidator = require("@validators/upload.validator");
const bannerValidator = require("@validators/banner.validator");
const validate = require("@utils/validatehelper");

const router = express.Router();

// Áp dụng middleware auth cho tất cả routes - Staff và Admin đều có quyền quản lý ảnh
router.use(protect);
router.use(requireStaffOrAdmin);

/**
 * @route   POST /api/v1/admin/images/brand/:brandId/logo
 * @desc    Upload logo cho brand
 * @access  Staff/Admin
 */
router.post(
  "/brand/:brandId/logo",
  validate(uploadValidator.validateBrandId),
  uploadMiddleware.uploadBrandLogo,
  validate([
    uploadValidator.validateSingleFileExists,
    uploadValidator.validateImageFileType,
    uploadValidator.validateImageFileSize,
  ]),
  imageController.uploadBrandLogo
);

/**
 * @route   DELETE /api/v1/admin/images/brand/:brandId/logo
 * @desc    Xóa logo của brand
 * @access  Staff/Admin
 */
router.delete(
  "/brand/:brandId/logo",
  validate(uploadValidator.validateBrandId),
  imageController.removeBrandLogo
);

/**
 * @route   POST /api/v1/admin/images/product/:productId
 * @desc    Upload ảnh cho product
 * @access  Staff/Admin
 */
router.post(
  "/product/:productId",
  validate(uploadValidator.validateProductId),
  uploadMiddleware.uploadProductImages,
  validate([
    uploadValidator.validateMultipleFilesExist,
    uploadValidator.validateMultipleImageFileTypes,
    uploadValidator.validateMultipleImageFileSizes,
    uploadValidator.validateMaxFileCount,
  ]),
  imageController.uploadProductImages
);

/**
 * @route   DELETE /api/v1/admin/images/product/:productId
 * @desc    Xóa ảnh của product
 * @access  Staff/Admin
 */
router.delete(
  "/product/:productId",
  validate([
    uploadValidator.validateProductId,
    uploadValidator.validateImageIds,
  ]),
  imageController.removeProductImages
);

/**
 * @route   POST /api/v1/admin/images/variant/:variantId
 * @desc    Upload ảnh cho variant
 * @access  Staff/Admin
 */
router.post(
  "/variant/:variantId",
  validate(uploadValidator.validateVariantId),
  uploadMiddleware.uploadVariantImages,
  validate([
    uploadValidator.validateMultipleFilesExist,
    uploadValidator.validateMultipleImageFileTypes,
    uploadValidator.validateMultipleImageFileSizes,
    uploadValidator.validateMaxFileCount,
  ]),
  imageController.uploadVariantImages
);

/**
 * @route   DELETE /api/v1/admin/images/variant/:variantId
 * @desc    Xóa ảnh của variant
 * @access  Staff/Admin
 */
router.delete(
  "/variant/:variantId",
  validate([
    uploadValidator.validateVariantId,
    uploadValidator.validateImageIds,
  ]),
  imageController.removeVariantImages
);

/**
 * @route   PUT /api/v1/admin/images/product/:productId/reorder
 * @desc    Thay đổi thứ tự ảnh product
 * @access  Staff/Admin
 */
router.put(
  "/product/:productId/reorder",
  validate([
    uploadValidator.validateProductId,
    uploadValidator.validateImageOrders,
  ]),
  imageController.reorderProductImages
);

/**
 * @route   PUT /api/v1/admin/images/variant/:variantId/reorder
 * @desc    Thay đổi thứ tự ảnh variant
 * @access  Staff/Admin
 */
router.put(
  "/variant/:variantId/reorder",
  validate([
    uploadValidator.validateVariantId,
    uploadValidator.validateImageOrders,
  ]),
  imageController.reorderVariantImages
);

/**
 * @route   PUT /api/v1/admin/images/product/:productId/set-main
 * @desc    Đặt ảnh chính cho product
 * @access  Staff/Admin
 */
router.put(
  "/product/:productId/set-main",
  validate([
    uploadValidator.validateProductId,
    uploadValidator.validateMainImage,
  ]),
  imageController.setProductMainImage
);

/**
 * @route   PUT /api/v1/admin/images/variant/:variantId/set-main
 * @desc    Đặt ảnh chính cho variant
 * @access  Staff/Admin
 */
router.put(
  "/variant/:variantId/set-main",
  validate([
    uploadValidator.validateVariantId,
    uploadValidator.validateMainImage,
  ]),
  imageController.setVariantMainImage
);

/**
 * @route   DELETE /api/v1/admin/images/cloudinary
 * @desc    Xóa ảnh trực tiếp từ Cloudinary
 * @access  Staff/Admin
 */
router.delete(
  "/cloudinary",
  validate(uploadValidator.validateCloudinaryDelete),
  imageController.deleteFromCloudinary
);

/**
 * @route   POST /api/v1/admin/images/blog-content
 * @desc    Upload ảnh cho blog content (dùng trong markdown editor)
 * @access  Staff/Admin
 * @note    Frontend: Kết hợp Option A + B (Markdown Editor + Drag/Paste)
 *          - Dùng react-markdown-editor-lite hoặc SimpleMDE
 *          - Implement onImageUpload callback để gọi API này
 *          - Hỗ trợ Ctrl+V paste ảnh và drag & drop
 *          - API trả về { url, public_id } để chèn vào markdown: ![](url)
 *          - Khi xóa blog, ảnh trong content sẽ tự động cleanup
 */
router.post(
  "/blog-content",
  uploadMiddleware.uploadBlogContentImage,
  validate([
    uploadValidator.validateSingleFileExists,
    uploadValidator.validateImageFileType,
    uploadValidator.validateImageFileSize,
  ]),
  imageController.uploadBlogContentImage
);

// ======================== BANNER IMAGE ROUTES ========================

/**
 * @route   POST /api/v1/admin/images/banner
 * @desc    Tạo banner mới với ảnh
 * @access  Staff/Admin
 */
router.post(
  "/banner",
  uploadMiddleware.uploadBannerImage,
  validate([
    bannerValidator.validateCreateBanner,
    uploadValidator.validateSingleFileExists,
    uploadValidator.validateImageFileType,
    uploadValidator.validateImageFileSize,
  ]),
  imageController.uploadBannerImage
);

/**
 * @route   PUT /api/v1/admin/images/banner/:bannerId
 * @desc    Cập nhật ảnh banner
 * @access  Staff/Admin
 */
router.put(
  "/banner/:bannerId",
  validate(uploadValidator.validateBannerId),
  uploadMiddleware.uploadBannerImage,
  validate([
    uploadValidator.validateSingleFileExists,
    uploadValidator.validateImageFileType,
    uploadValidator.validateImageFileSize,
  ]),
  imageController.updateBannerImage
);

/**
 * @route   DELETE /api/v1/admin/images/banner/:bannerId
 * @desc    Xóa banner
 * @access  Staff/Admin
 */
router.delete(
  "/banner/:bannerId",
  validate(uploadValidator.validateBannerId),
  imageController.deleteBannerImage
);

// ======================== BLOG IMAGE ROUTES ========================

/**
 * @route   PUT /api/v1/admin/images/blog/:postId/thumbnail
 * @desc    Upload/cập nhật thumbnail cho blog post
 * @access  Staff/Admin
 */
router.put(
  "/blog/:postId/thumbnail",
  validate(uploadValidator.validateBlogPostId),
  uploadMiddleware.uploadBlogThumbnail,
  validate([
    uploadValidator.validateSingleFileExists,
    uploadValidator.validateImageFileType,
    uploadValidator.validateImageFileSize,
  ]),
  imageController.uploadBlogThumbnail
);

/**
 * @route   DELETE /api/v1/admin/images/blog/:postId/thumbnail
 * @desc    Xóa thumbnail của blog post
 * @access  Staff/Admin
 */
router.delete(
  "/blog/:postId/thumbnail",
  validate(uploadValidator.validateBlogPostId),
  imageController.removeBlogThumbnail
);

/**
 * @route   PUT /api/v1/admin/images/blog/:postId/featured-image
 * @desc    Upload/cập nhật featured image cho blog post
 * @access  Staff/Admin
 */
router.put(
  "/blog/:postId/featured-image",
  validate(uploadValidator.validateBlogPostId),
  uploadMiddleware.uploadBlogFeaturedImage,
  validate([
    uploadValidator.validateSingleFileExists,
    uploadValidator.validateImageFileType,
    uploadValidator.validateImageFileSize,
  ]),
  imageController.uploadBlogFeaturedImage
);

/**
 * @route   DELETE /api/v1/admin/images/blog/:postId/featured-image
 * @desc    Xóa featured image của blog post
 * @access  Staff/Admin
 */
router.delete(
  "/blog/:postId/featured-image",
  validate(uploadValidator.validateBlogPostId),
  imageController.removeBlogFeaturedImage
);

// ======================== SIZE GUIDE IMAGE ROUTES ========================

/**
 * @route   PUT /api/v1/admin/images/size-guide/:sizeGuideId/size-chart
 * @desc    Upload/cập nhật ảnh size chart
 * @access  Staff/Admin
 */
router.put(
  "/size-guide/:sizeGuideId/size-chart",
  validate(uploadValidator.validateSizeGuideId),
  uploadMiddleware.uploadSizeChartImage,
  validate([
    uploadValidator.validateSingleFileExists,
    uploadValidator.validateImageFileType,
    uploadValidator.validateImageFileSize,
  ]),
  imageController.uploadSizeChartImage
);

/**
 * @route   PUT /api/v1/admin/images/size-guide/:sizeGuideId/measurement
 * @desc    Upload/cập nhật ảnh measurement guide
 * @access  Staff/Admin
 */
router.put(
  "/size-guide/:sizeGuideId/measurement",
  validate(uploadValidator.validateSizeGuideId),
  uploadMiddleware.uploadMeasurementGuideImage,
  validate([
    uploadValidator.validateSingleFileExists,
    uploadValidator.validateImageFileType,
    uploadValidator.validateImageFileSize,
  ]),
  imageController.uploadMeasurementGuideImage
);

module.exports = router;
