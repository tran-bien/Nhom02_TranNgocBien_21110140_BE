const { Color, Variant } = require("@models");
const {
  getVietnameseCollation,
  needsVietnameseCollation,
} = require("@utils/collation");
const ApiError = require("@utils/ApiError");

// Hàm hỗ trợ xử lý các case sắp xếp
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
      default:
        try {
          sortOption = JSON.parse(sortParam);
          // Kiểm tra nếu sort theo name thì thêm collation
          if (needsVietnameseCollation(JSON.stringify(sortOption))) {
            collation = getVietnameseCollation();
          }
        } catch (err) {
          sortOption = { createdAt: -1 };
        }
        break;
    }
  }

  return { sortOption, collation };
};

const colorService = {
  // === ADMIN API METHODS ===

  /**
   * [ADMIN] Lấy tất cả màu sắc (bao gồm cả đã xóa)
   * @param {Object} queryParams - Các tham số truy vấn
   */
  getAdminColors: async (queryParams) => {
    const { page = 1, limit = 50, name, type, sort } = queryParams;

    // Chuyển đổi page và limit sang number
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 15;

    const filter = { deletedAt: null }; // Mặc định chỉ lấy các màu chưa xóa

    // Tìm theo tên
    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    // Tìm theo loại
    if (type) {
      filter.type = type;
    }

    // Đếm tổng số màu thỏa mãn điều kiện
    const total = await Color.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    // Tính toán skip để phân trang
    const skip = (pageNum - 1) * limitNum;

    // Sắp xếp
    const { sortOption, collation } = sort
      ? getSortOption(sort)
      : { sortOption: { createdAt: -1 }, collation: null };

    // Lấy dữ liệu với phân trang
    let query = Color.find(filter).sort(sortOption).skip(skip).limit(limitNum);

    // Thêm collation nếu có
    if (collation) {
      query = query.collation(collation);
    }

    const colors = await query;

    // Trả về kết quả với thông tin phân trang chính xác
    return {
      success: true,
      count: colors.length,
      total,
      totalPages,
      currentPage: pageNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
      data: colors,
    };
  },

  /**
   * [ADMIN] Lấy màu sắc theo ID (bao gồm cả đã xóa mềm)
   * @param {string} id - ID của màu sắc
   */
  getAdminColorById: async (id) => {
    // Sử dụng setOptions để bao gồm cả màu đã xóa
    const color = await Color.findById(id)
      .setOptions({
        includeDeleted: true,
      })
      .populate("deletedBy", "name email");

    if (!color) {
      throw new ApiError(404, `Không tìm thấy màu sắc id: ${id}`);
    }

    return { success: true, color };
  },

  /**
   * [ADMIN] Lấy danh sách màu sắc đã xóa
   * @param {Object} queryParams - Các tham số truy vấn
   */
  getDeletedColors: async (queryParams) => {
    const { page = 1, limit = 15, name, type, sort } = queryParams;

    // Chuyển đổi page và limit sang number
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 15;

    // Xây dựng query cho các màu đã xóa
    const filter = { deletedAt: { $ne: null } };

    // Tìm theo tên
    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    // Tìm theo loại
    if (type) {
      filter.type = type;
    }

    // Đếm tổng số màu đã xóa thỏa mãn điều kiện
    const total = await Color.countDocuments(filter).setOptions({
      includeDeleted: true,
    });
    const totalPages = Math.ceil(total / limitNum);

    // Tính toán skip để phân trang
    const skip = (pageNum - 1) * limitNum;

    // Sắp xếp
    const { sortOption, collation } = sort
      ? getSortOption(sort)
      : { sortOption: { deletedAt: -1 }, collation: null };

    // Lấy dữ liệu với phân trang
    let deletedQuery = Color.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .populate("deletedBy", "name email")
      .setOptions({ includeDeleted: true });

    // Thêm collation nếu có
    if (collation) {
      deletedQuery = deletedQuery.collation(collation);
    }

    const colors = await deletedQuery;

    // Trả về kết quả với thông tin phân trang chính xác
    return {
      success: true,
      count: colors.length,
      total,
      totalPages,
      currentPage: pageNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
      data: colors,
    };
  },

  // === ADMIN OPERATIONS ===

  /**
   * Tạo màu sắc mới
   * @param {Object} colorData - Dữ liệu màu sắc
   */
  createColor: async (colorData) => {
    // Kiểm tra xem màu sắc có tồn tại chưa theo tên kể cả đã xóa
    const existingColorName = await Color.findOne({
      name: colorData.name,
    }).setOptions({ includeDeleted: true });

    if (existingColorName) {
      if (existingColorName.deletedAt) {
        throw new ApiError(
          409,
          `Tên màu ${colorData.name} đã tồn tại trong một màu đã xóa. Vui lòng khôi phục hoặc chọn tên khác.`
        );
      } else {
        throw new ApiError(409, `Tên màu ${colorData.name} đã tồn tại`);
      }
    }

    // Kiểm tra trùng mã màu cho màu solid
    if (colorData.type === "solid" && colorData.code) {
      const existingColorCode = await Color.findOne({
        code: colorData.code.toUpperCase(),
        type: "solid",
      }).setOptions({ includeDeleted: true });

      if (existingColorCode) {
        if (existingColorCode.deletedAt) {
          throw new ApiError(
            409,
            `Mã màu ${colorData.code} đã được sử dụng bởi màu "${existingColorCode.name}" đã xóa. Vui lòng khôi phục hoặc chọn mã khác.`
          );
        } else {
          throw new ApiError(
            409,
            `Mã màu ${colorData.code} đã được sử dụng bởi màu "${existingColorCode.name}"`
          );
        }
      }
    }

    // Kiểm tra bộ màu trùng lặp khi thêm màu half
    if (
      colorData.type === "half" &&
      Array.isArray(colorData.colors) &&
      colorData.colors.length === 2
    ) {
      // Chuẩn hóa mã màu sang chữ in hoa để so sánh
      const normalizedColors = colorData.colors.map((color) =>
        color.toUpperCase()
      );

      // Tìm tất cả màu half (bao gồm cả đã xóa)
      const halfColors = await Color.find({
        type: "half",
      }).setOptions({ includeDeleted: true });

      // Kiểm tra từng màu half xem có bộ màu giống nhau không
      for (const halfColor of halfColors) {
        if (!halfColor.colors || halfColor.colors.length !== 2) continue;

        const existingColors = halfColor.colors.map((color) =>
          color.toUpperCase()
        );

        // Kiểm tra nếu 2 mảng có cùng các phần tử (không quan tâm thứ tự)
        if (
          (normalizedColors[0] === existingColors[0] &&
            normalizedColors[1] === existingColors[1]) ||
          (normalizedColors[0] === existingColors[1] &&
            normalizedColors[1] === existingColors[0])
        ) {
          if (halfColor.deletedAt) {
            throw new ApiError(
              409,
              `Bộ màu này đã được sử dụng bởi màu "${halfColor.name}" đã xóa. Vui lòng khôi phục hoặc chọn bộ màu khác.`
            );
          } else {
            throw new ApiError(
              409,
              `Bộ màu này đã được sử dụng bởi màu "${halfColor.name}"`
            );
          }
        }
      }
    }

    // Tạo màu sắc mới
    const color = await Color.create(colorData);

    return {
      success: true,
      message: `Tạo màu sắc id: ${color.id} thành công`,
      color,
    };
  },

  /**
   * Cập nhật màu sắc
   * @param {string} id - ID màu sắc
   * @param {Object} updateData - Dữ liệu cập nhật
   */
  updateColor: async (id, updateData) => {
    // Kiểm tra màu sắc tồn tại
    const color = await Color.findById(id);

    if (!color) {
      throw new ApiError(404, `Không tìm thấy màu sắc id: ${id}`);
    }

    // Kiểm tra nếu đang cập nhật tên, xem tên đã tồn tại chưa
    if (updateData.name && updateData.name !== color.name) {
      const existingColor = await Color.findOne({
        name: updateData.name,
        _id: { $ne: id },
      }).setOptions({ includeDeleted: true });

      if (existingColor) {
        if (existingColor.deletedAt) {
          throw new ApiError(
            409,
            `Tên màu ${updateData.name} đã tồn tại trong một màu đã xóa. Vui lòng khôi phục hoặc chọn tên khác.`
          );
        } else {
          throw new ApiError(409, `Tên màu ${updateData.name} đã tồn tại`);
        }
      }
    }

    // Kiểm tra mã màu trùng lặp khi cập nhật màu solid
    if (updateData.type === "solid" && updateData.code) {
      const existingColorCode = await Color.findOne({
        code: updateData.code.toUpperCase(),
        type: "solid",
        _id: { $ne: id },
      }).setOptions({ includeDeleted: true });

      if (existingColorCode) {
        if (existingColorCode.deletedAt) {
          throw new ApiError(
            409,
            `Mã màu ${updateData.code} đã được sử dụng bởi màu "${existingColorCode.name}" đã xóa. Vui lòng khôi phục hoặc chọn mã khác.`
          );
        } else {
          throw new ApiError(
            409,
            `Mã màu ${updateData.code} đã được sử dụng bởi màu "${existingColorCode.name}"`
          );
        }
      }
    }

    // Kiểm tra bộ màu trùng lặp khi cập nhật màu half
    if (
      (updateData.type === "half" ||
        (!updateData.type && color.type === "half")) &&
      Array.isArray(updateData.colors) &&
      updateData.colors.length === 2
    ) {
      // Chuẩn hóa mã màu sang chữ in hoa để so sánh
      const normalizedColors = updateData.colors.map((color) =>
        color.toUpperCase()
      );

      // Tìm tất cả màu half
      const halfColors = await Color.find({
        type: "half",
        _id: { $ne: id },
      }).setOptions({ includeDeleted: true });

      // Kiểm tra từng màu half xem có bộ màu giống nhau không
      for (const halfColor of halfColors) {
        if (!halfColor.colors || halfColor.colors.length !== 2) continue;

        const existingColors = halfColor.colors.map((color) =>
          color.toUpperCase()
        );

        // Kiểm tra nếu 2 mảng có cùng các phần tử (không quan tâm thứ tự)
        if (
          (normalizedColors[0] === existingColors[0] &&
            normalizedColors[1] === existingColors[1]) ||
          (normalizedColors[0] === existingColors[1] &&
            normalizedColors[1] === existingColors[0])
        ) {
          if (halfColor.deletedAt) {
            throw new ApiError(
              409,
              `Bộ màu này đã được sử dụng bởi màu "${halfColor.name}" đã xóa. Vui lòng khôi phục hoặc chọn bộ màu khác.`
            );
          } else {
            throw new ApiError(
              409,
              `Bộ màu này đã được sử dụng bởi màu "${halfColor.name}"`
            );
          }
        }
      }
    }

    // Cập nhật màu sắc
    const updatedColor = await Color.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return {
      success: true,
      message: `Cập nhật màu sắc ${updatedColor.name} thành công`,
      color: updatedColor,
    };
  },

  /**
   * Xóa mềm màu sắc - với kiểm tra ràng buộc
   * @param {string} id - ID màu sắc
   * @param {string} userId - ID người dùng thực hiện xóa
   */
  deleteColor: async (id, userId) => {
    // Kiểm tra màu sắc tồn tại
    const color = await Color.findById(id);

    if (!color) {
      throw new ApiError(404, `Không tìm thấy màu sắc id: ${id}`);
    }

    // Kiểm tra xem màu sắc có được sử dụng trong biến thể nào không
    const variantCount = await Variant.countDocuments({ color: id });

    // Nếu có biến thể liên kết, thông báo lỗi và không cho xóa
    if (variantCount > 0) {
      throw new ApiError(
        409,
        `Màu sắc đang được sử dụng trong ${variantCount} biến thể sản phẩm nên không thể xóa.`
      );
    }

    // Nếu không có biến thể liên kết, tiến hành xóa mềm
    await color.softDelete(userId);

    return {
      success: true,
      message: `Xóa màu sắc id: ${color.id} thành công`,
      isDeleted: true,
    };
  },

  /**
   * Khôi phục màu sắc đã xóa
   * @param {string} id - ID màu sắc
   */
  restoreColor: async (id) => {
    // Sử dụng phương thức tĩnh restoreById từ plugin
    const color = await Color.restoreById(id);

    return {
      success: true,
      message: `Khôi phục màu sắc id: ${color.id} thành công`,
      color,
    };
  },
};

module.exports = colorService;
