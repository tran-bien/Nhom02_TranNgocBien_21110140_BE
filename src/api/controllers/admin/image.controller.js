const asyncHandler = require("express-async-handler");
const imageService = require("@services/image.service");
const { processCloudinaryUpload } = require("@middlewares/upload.middleware");

const imageController = {
  /**
   * @route POST /api/admin/images/brand/:brandId/logo
   * @desc Upload logo cho brand
   */
  uploadBrandLogo: asyncHandler(async (req, res) => {
    const { brandId } = req.params;

    // Upload to Cloudinary after validation
    await processCloudinaryUpload(req);

    const logoData = {
      url: req.file.path,
      public_id: req.file.filename,
    };

    const result = await imageService.updateBrandLogo(brandId, logoData);
    res.json(result);
  }),

  /**
   * @route DELETE /api/admin/images/brand/:brandId/logo
   * @desc Xóa logo của brand
   */
  removeBrandLogo: asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const result = await imageService.removeBrandLogo(brandId);
    res.json(result);
  }),

  /**
   * @route POST /api/admin/images/product/:productId
   * @desc Upload ảnh cho product
   */
  uploadProductImages: asyncHandler(async (req, res) => {
    const { productId } = req.params;

    // Upload to Cloudinary after validation
    await processCloudinaryUpload(req);

    const images = req.files.map((file, index) => ({
      url: file.path,
      public_id: file.filename,
      isMain: index === 0, // Ảnh đầu tiên sẽ là ảnh chính
      displayOrder: index,
    }));

    const result = await imageService.addProductImages(productId, images);
    res.json(result);
  }),

  /**
   * @route DELETE /api/admin/images/product/:productId
   * @desc Xóa ảnh của product
   */
  removeProductImages: asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { imageIds } = req.body;

    const result = await imageService.removeProductImages(productId, imageIds);
    res.json(result);
  }),

  /**
   * @desc    Upload ảnh cho variant
   * @route   POST /api/admin/images/variant/:variantId
   * @access  Staff/Admin
   */
  uploadVariantImages: asyncHandler(async (req, res) => {
    const { variantId } = req.params;

    // Upload to Cloudinary after validation
    await processCloudinaryUpload(req);

    const images = req.files.map((file, index) => ({
      url: file.path,
      public_id: file.filename,
      isMain: index === 0, // Ảnh đầu tiên sẽ là ảnh chính
      displayOrder: index,
    }));

    const result = await imageService.addVariantImages(variantId, images);
    res.json(result);
  }),

  /**
   * @desc    Xóa ảnh của variant
   * @route   DELETE /api/admin/images/variant/:variantId
   * @access  Staff/Admin
   */
  removeVariantImages: asyncHandler(async (req, res) => {
    const { variantId } = req.params;
    const { imageIds } = req.body;

    const result = await imageService.removeVariantImages(variantId, imageIds);
    res.json(result);
  }),

  /**
   * @desc    Sắp xếp ảnh của product
   * @route   PUT /api/admin/images/product/:productId/reorder
   * @access  Staff/Admin
   */
  reorderProductImages: asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { imageOrders } = req.body;

    const result = await imageService.reorderProductImages(
      productId,
      imageOrders
    );
    res.json(result);
  }),

  /**
   * @desc    Sắp xếp ảnh của variant
   * @route   PUT /api/admin/images/variant/:variantId/reorder
   * @access  Staff/Admin
   */
  reorderVariantImages: asyncHandler(async (req, res) => {
    const { variantId } = req.params;
    const { imageOrders } = req.body;

    const result = await imageService.reorderVariantImages(
      variantId,
      imageOrders
    );
    res.json(result);
  }),

  /**
   * @desc    Đặt ảnh chính cho product
   * @route   PUT /api/admin/images/product/:productId/set-main
   * @access  Staff/Admin
   */
  setProductMainImage: asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { imageId } = req.body;

    const result = await imageService.setProductMainImage(productId, imageId);
    res.json(result);
  }),

  /**
   * @desc    Đặt ảnh chính cho variant
   * @route   PUT /api/admin/images/variant/:variantId/set-main
   * @access  Staff/Admin
   */
  setVariantMainImage: asyncHandler(async (req, res) => {
    const { variantId } = req.params;
    const { imageId } = req.body;

    const result = await imageService.setVariantMainImage(variantId, imageId);
    res.json(result);
  }),

  /**
   * @desc    Xóa ảnh trực tiếp từ Cloudinary
   * @route   DELETE /api/admin/images/cloudinary
   * @access  Staff/Admin
   */
  deleteFromCloudinary: asyncHandler(async (req, res) => {
    let publicIds = req.body.publicIds || [req.body.publicId];

    const results = await imageService.deleteImages(publicIds);

    res.json({
      success: true,
      message: "Xóa ảnh từ Cloudinary thành công",
      results,
    });
  }),

  /**
   * @desc    Upload ảnh cho blog content (markdown editor)
   * @route   POST /api/admin/images/blog-content
   * @access  Staff/Admin
   * @note    Frontend implementation guide:
   *          - Use react-markdown-editor-lite, SimpleMDE, or Toast UI Editor
   *          - Implement onImageUpload callback to call this API
   *          - Support Ctrl+V paste and drag & drop
   *          - API returns { url, public_id } for markdown insertion: ![](url)
   *          - Images auto-cleanup when blog post is deleted
   */
  uploadBlogContentImage: asyncHandler(async (req, res) => {
    // Upload to Cloudinary after validation
    await processCloudinaryUpload(req);

    const imageData = {
      url: req.file.path,
      public_id: req.file.filename,
    };

    const result = await imageService.uploadBlogContentImage(imageData);
    res.json(result);
  }),

  // ======================== BANNER IMAGE OPERATIONS ========================

  /**
   * @desc    Tạo banner với ảnh
   * @route   POST /api/admin/images/banner
   * @access  Staff/Admin
   */
  uploadBannerImage: asyncHandler(async (req, res) => {
    await processCloudinaryUpload(req);

    const imageData = {
      url: req.file.path,
      public_id: req.file.filename,
    };

    const bannerData = {
      title: req.body.title,
      displayOrder: parseInt(req.body.displayOrder),
      link: req.body.link || "",
      isActive:
        req.body.isActive !== undefined
          ? req.body.isActive === "true" || req.body.isActive === true
          : true,
    };

    const result = await imageService.uploadBannerImage(imageData, bannerData);
    res.status(201).json(result);
  }),

  /**
   * @desc    Cập nhật ảnh banner
   * @route   PUT /api/admin/images/banner/:bannerId
   * @access  Staff/Admin
   */
  updateBannerImage: asyncHandler(async (req, res) => {
    const { bannerId } = req.params;

    await processCloudinaryUpload(req);

    const imageData = {
      url: req.file.path,
      public_id: req.file.filename,
    };

    const result = await imageService.updateBannerImage(bannerId, imageData);
    res.json(result);
  }),

  /**
   * @desc    Xóa banner
   * @route   DELETE /api/admin/images/banner/:bannerId
   * @access  Staff/Admin
   */
  deleteBannerImage: asyncHandler(async (req, res) => {
    const { bannerId } = req.params;
    const result = await imageService.deleteBannerImage(bannerId, req.user._id);
    res.json(result);
  }),

  // ======================== BLOG IMAGE OPERATIONS ========================

  /**
   * @desc    Upload/cập nhật thumbnail cho blog post
   * @route   PUT /api/admin/images/blog/:postId/thumbnail
   * @access  Staff/Admin
   */
  uploadBlogThumbnail: asyncHandler(async (req, res) => {
    const { postId } = req.params;

    await processCloudinaryUpload(req);

    const imageData = {
      url: req.file.path,
      public_id: req.file.filename,
    };

    const result = await imageService.updateBlogThumbnail(postId, imageData);
    res.json(result);
  }),

  /**
   * @desc    Xóa thumbnail của blog post
   * @route   DELETE /api/admin/images/blog/:postId/thumbnail
   * @access  Staff/Admin
   */
  removeBlogThumbnail: asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const result = await imageService.removeBlogThumbnail(postId);
    res.json(result);
  }),

  /**
   * @desc    Upload/cập nhật featured image cho blog post
   * @route   PUT /api/admin/images/blog/:postId/featured-image
   * @access  Staff/Admin
   */
  uploadBlogFeaturedImage: asyncHandler(async (req, res) => {
    const { postId } = req.params;

    await processCloudinaryUpload(req);

    const imageData = {
      url: req.file.path,
      public_id: req.file.filename,
    };

    const { caption, alt } = req.body;

    const result = await imageService.updateBlogFeaturedImage(
      postId,
      imageData,
      caption,
      alt
    );
    res.json(result);
  }),

  /**
   * @desc    Xóa featured image của blog post
   * @route   DELETE /api/admin/images/blog/:postId/featured-image
   * @access  Staff/Admin
   */
  removeBlogFeaturedImage: asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const result = await imageService.removeBlogFeaturedImage(postId);
    res.json(result);
  }),

  // ======================== SIZE GUIDE IMAGE OPERATIONS ========================

  /**
   * @desc    Upload/cập nhật ảnh size chart cho size guide
   * @route   PUT /api/admin/images/size-guide/:sizeGuideId/size-chart
   * @access  Staff/Admin
   */
  uploadSizeChartImage: asyncHandler(async (req, res) => {
    const { sizeGuideId } = req.params;

    await processCloudinaryUpload(req);

    const imageData = {
      url: req.file.path,
      public_id: req.file.filename,
    };

    const result = await imageService.updateSizeChartImage(
      sizeGuideId,
      imageData
    );
    res.json(result);
  }),

  /**
   * @desc    Upload/cập nhật ảnh measurement guide cho size guide
   * @route   PUT /api/admin/images/size-guide/:sizeGuideId/measurement
   * @access  Staff/Admin
   */
  uploadMeasurementGuideImage: asyncHandler(async (req, res) => {
    const { sizeGuideId } = req.params;

    await processCloudinaryUpload(req);

    const imageData = {
      url: req.file.path,
      public_id: req.file.filename,
    };

    const result = await imageService.updateMeasurementGuideImage(
      sizeGuideId,
      imageData
    );
    res.json(result);
  }),
};

module.exports = imageController;
