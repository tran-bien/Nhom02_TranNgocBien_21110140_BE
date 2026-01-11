const asyncHandler = require("express-async-handler");
const imageService = require("@services/image.service");
const { processCloudinaryUpload } = require("@middlewares/upload.middleware");

const imageController = {
  /**
   * @desc    Upload ảnh đại diện cho người dùng đã đăng nhập
   * @route   POST /api/images/avatar
   * @access  Private
   */
  uploadAvatar: asyncHandler(async (req, res) => {
    // Upload to Cloudinary after validation
    await processCloudinaryUpload(req);

    const avatarData = {
      url: req.file.path,
      public_id: req.file.filename,
    };

    // Lấy userId từ người dùng đang đăng nhập
    const userId = req.user._id;

    const result = await imageService.updateUserAvatar(userId, avatarData);
    res.json(result);
  }),

  /**
   * @desc    Xóa ảnh đại diện của người dùng đã đăng nhập
   * @route   DELETE /api/images/avatar
   * @access  Private
   */
  removeAvatar: asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const result = await imageService.removeUserAvatar(userId);
    res.json(result);
  }),
};

module.exports = imageController;
