const { Tag } = require("@models");
const ApiError = require("@utils/ApiError");
const paginate = require("@utils/pagination");
const paginateDeleted = require("@utils/paginationDeleted");
const {
  getVietnameseCollation,
  needsVietnameseCollation,
} = require("@utils/collation");

// Hàm hỗ trợ tạo sort option
const getSortOption = (sortParam) => {
  let sortOption = { createdAt: -1 };
  let collation = null;

  if (sortParam) {
    switch (sortParam) {
      case "created_at_asc":
        sortOption = { createdAt: 1 };
        break;
      case "created_at_desc":
        sortOption = { createdAt: -1 };
        break;
      case "name_asc":
        sortOption = { name: 1 };
        collation = getVietnameseCollation();
        break;
      case "name_desc":
        sortOption = { name: -1 };
        collation = getVietnameseCollation();
        break;
      case "type_asc":
        sortOption = { type: 1 };
        break;
      case "type_desc":
        sortOption = { type: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }
  }

  return { sortOption, collation };
};

const tagService = {
  // === PUBLIC OPERATIONS ===

  /**
   * [PUBLIC] Lấy tất cả tags đang active (cho user)
   */
  getPublicAllTags: async () => {
    return await Tag.find({ isActive: true, deletedAt: null })
      .select("-deletedBy -deletedAt")
      .sort({ type: 1, name: 1 })
      .collation(getVietnameseCollation());
  },

  /**
   * [PUBLIC] Lấy tags theo type (cho user)
   */
  getPublicTagsByType: async (type) => {
    const upperType = type.toUpperCase();
    const validTypes = ["MATERIAL", "USECASE", "CUSTOM"];

    if (!validTypes.includes(upperType)) {
      throw new ApiError(
        400,
        "Type không hợp lệ. Chỉ chấp nhận: MATERIAL, USECASE, CUSTOM"
      );
    }

    return await Tag.find({
      type: upperType,
      isActive: true,
      deletedAt: null,
    })
      .select("-deletedBy -deletedAt")
      .sort("name")
      .collation(getVietnameseCollation());
  },

  /**
   * [PUBLIC] Lấy tag theo ID (chỉ active và chưa xóa)
   */
  getPublicTagById: async (tagId) => {
    const tag = await Tag.findOne({
      _id: tagId,
      isActive: true,
      deletedAt: null,
    }).select("-deletedBy -deletedAt");

    if (!tag) {
      throw new ApiError(404, "Tag không tồn tại hoặc đã bị vô hiệu hóa");
    }

    return { success: true, tag };
  },

  // === ADMIN OPERATIONS ===

  /**
   * Lấy tất cả tags (có phân trang, filter)
   */
  getAllTags: async (query = {}) => {
    const { page = 1, limit = 20, name, type, isActive, sort } = query;

    const filter = { deletedAt: null };

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    if (type) {
      filter.type = type.toUpperCase();
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true" || isActive === true;
    }

    const { sortOption, collation } = sort
      ? getSortOption(sort)
      : { sortOption: { createdAt: -1 }, collation: null };

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: sortOption,
      collation: collation,
    };

    return await paginate(Tag, filter, options);
  },

  /**
   * Lấy danh sách tags đã xóa
   */
  getDeletedTags: async (query = {}) => {
    const { page = 1, limit = 20, name, type, sort } = query;

    const filter = { deletedAt: { $ne: null } };

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    if (type) {
      filter.type = type.toUpperCase();
    }

    const { sortOption, collation } = sort
      ? getSortOption(sort)
      : { sortOption: { deletedAt: -1 }, collation: null };

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: sortOption,
      collation: collation,
      populate: [{ path: "deletedBy", select: "name email" }],
    };

    return await paginateDeleted(Tag, filter, options);
  },

  /**
   * Lấy chi tiết tag theo ID
   */
  getTagById: async (id) => {
    const tag = await Tag.findById(id);

    if (!tag) {
      throw new ApiError(404, "Không tìm thấy tag");
    }

    return {
      success: true,
      tag,
    };
  },

  /**
   * Tạo tag mới
   */
  createTag: async (tagData) => {
    // Chuẩn hóa type
    if (tagData.type) {
      tagData.type = tagData.type.toUpperCase();
    }

    // Kiểm tra tag trùng tên (bao gồm cả đã xóa mềm)
    const existingTag = await Tag.findOne({
      name: tagData.name,
      type: tagData.type,
    }).setOptions({ includeDeleted: true });

    if (existingTag) {
      if (existingTag.deletedAt) {
        throw new ApiError(
          409,
          `Tag "${tagData.name}" (${tagData.type}) đã tồn tại trong tag đã xóa. Vui lòng khôi phục hoặc chọn tên khác.`
        );
      } else {
        throw new ApiError(
          409,
          `Tag "${tagData.name}" (${tagData.type}) đã tồn tại`
        );
      }
    }

    const tag = await Tag.create(tagData);

    return {
      success: true,
      message: `Tạo tag "${tag.name}" thành công`,
      tag,
    };
  },

  /**
   * Cập nhật tag
   */
  updateTag: async (id, updateData) => {
    const tag = await Tag.findById(id);

    if (!tag) {
      throw new ApiError(404, "Không tìm thấy tag");
    }

    // Chuẩn hóa type nếu có
    if (updateData.type) {
      updateData.type = updateData.type.toUpperCase();
    }

    // Kiểm tra trùng tên khi cập nhật
    if (updateData.name || updateData.type) {
      const nameToCheck = updateData.name || tag.name;
      const typeToCheck = updateData.type || tag.type;

      const existingTag = await Tag.findOne({
        name: nameToCheck,
        type: typeToCheck,
        _id: { $ne: id },
      }).setOptions({ includeDeleted: true });

      if (existingTag) {
        if (existingTag.deletedAt) {
          throw new ApiError(
            409,
            `Tag "${nameToCheck}" (${typeToCheck}) đã tồn tại trong tag đã xóa.`
          );
        } else {
          throw new ApiError(
            409,
            `Tag "${nameToCheck}" (${typeToCheck}) đã tồn tại`
          );
        }
      }
    }

    Object.assign(tag, updateData);
    await tag.save();

    return {
      success: true,
      message: "Cập nhật tag thành công",
      tag,
    };
  },

  /**
   * Xóa mềm tag
   */
  deleteTag: async (id, userId) => {
    const tag = await Tag.findById(id);

    if (!tag) {
      throw new ApiError(404, "Không tìm thấy tag");
    }

    // Kiểm tra xem tag có đang được sử dụng không
    const { Product } = require("@models");
    const productCount = await Product.countDocuments({
      tags: id,
      deletedAt: null,
    });

    if (productCount > 0) {
      throw new ApiError(
        400,
        `Không thể xóa vì có ${productCount} sản phẩm đang sử dụng tag này`
      );
    }

    // Thực hiện xóa mềm
    tag.deletedAt = new Date();
    tag.deletedBy = userId;
    await tag.save();

    return {
      success: true,
      message: `Xóa tag "${tag.name}" thành công`,
      isDeleted: true,
    };
  },

  /**
   * Khôi phục tag đã xóa
   */
  restoreTag: async (id) => {
    const tag = await Tag.findById(id).setOptions({ includeDeleted: true });

    if (!tag) {
      throw new ApiError(404, "Không tìm thấy tag");
    }

    if (!tag.deletedAt) {
      throw new ApiError(400, "Tag chưa bị xóa");
    }

    // Kiểm tra trùng khi khôi phục
    const existingTag = await Tag.findOne({
      name: tag.name,
      type: tag.type,
      deletedAt: null,
    });

    if (existingTag) {
      throw new ApiError(
        409,
        `Không thể khôi phục vì tag "${tag.name}" (${tag.type}) đang tồn tại`
      );
    }

    tag.deletedAt = null;
    tag.deletedBy = null;
    await tag.save();

    return {
      success: true,
      message: `Khôi phục tag "${tag.name}" thành công`,
      tag,
    };
  },

  /**
   * Cập nhật trạng thái active
   */
  updateTagStatus: async (id, isActive) => {
    const tag = await Tag.findById(id);

    if (!tag) {
      throw new ApiError(404, "Không tìm thấy tag");
    }

    tag.isActive = isActive;
    await tag.save();

    return {
      success: true,
      message: `${isActive ? "Kích hoạt" : "Vô hiệu hóa"} tag "${
        tag.name
      }" thành công`,
      tag,
    };
  },
};

module.exports = tagService;
