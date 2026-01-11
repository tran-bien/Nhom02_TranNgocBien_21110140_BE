const asyncHandler = require("express-async-handler");
const tagService = require("@services/tag.service");

const tagController = {
  /**
   * @route GET /api/tags
   * @desc Lấy danh sách tags đang active (chỉ lấy active và không xóa)
   */
  getPublicAllTags: asyncHandler(async (req, res) => {
    const result = await tagService.getPublicAllTags();
    return res.json({
      success: true,
      tags: result,
    });
  }),

  /**
   * @route GET /api/tags/type/:type
   * @desc Lấy tags theo type (MATERIAL/USECASE/CUSTOM)
   */
  getPublicTagsByType: asyncHandler(async (req, res) => {
    const result = await tagService.getPublicTagsByType(req.params.type);
    return res.json({
      success: true,
      tags: result,
    });
  }),

  /**
   * @route GET /api/tags/:id
   * @desc Lấy chi tiết tag theo ID
   */
  getPublicTagById: asyncHandler(async (req, res) => {
    const result = await tagService.getPublicTagById(req.params.id);
    return res.json(result);
  }),
};

module.exports = tagController;
