const { Category, Product, Variant } = require("@models");
const paginate = require("@utils/pagination");
const paginateDeleted = require("@utils/paginationDeleted");
const {
  getVietnameseCollation,
  needsVietnameseCollation,
} = require("@utils/collation");
const ApiError = require("@utils/ApiError");
const { createSlug } = require("@utils/slugify");

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

const categoryService = {
  // === ADMIN API METHODS ===

  /**
   * [ADMIN] Lấy tất cả category (bao gồm cả inactive)
   */
  getAdminAllCategories: async (query) => {
    const { page = 1, limit = 30, name, sort, isActive } = query;
    const filter = { deletedAt: null }; // Mặc định chỉ lấy các category chưa xóa

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    // Sửa điều kiện lọc isActive để xử lý cả chuỗi lẫn boolean
    if (isActive === "true" || isActive === true) {
      filter.isActive = true;
    } else if (isActive === "false" || isActive === false) {
      filter.isActive = false;
    }

    const { sortOption, collation } = sort
      ? getSortOption(sort)
      : { sortOption: { createdAt: -1 }, collation: null };

    const options = {
      page,
      limit,
      sort: sortOption,
      collation: collation,
    };

    return await paginate(Category, filter, options);
  },

  /**
   * [ADMIN] Lấy category theo ID (bao gồm cả inactive và đã xóa)
   */
  getAdminCategoryById: async (categoryId) => {
    // Sử dụng setOptions để bao gồm cả category đã xóa
    const category = await Category.findById(categoryId)
      .setOptions({
        includeDeleted: true,
      })
      .populate("deletedBy", "name email");

    if (!category) {
      throw new ApiError(404, `Không tìm thấy danh mục id: ${categoryId}`);
    }

    return {
      success: true,
      category,
    };
  },

  /**
   * [ADMIN] Lấy danh sách category đã xóa mềm
   */
  getDeletedCategories: async (query) => {
    const { page = 1, limit = 15, name, sort } = query;

    // Chuẩn bị filter
    const filter = {};

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    const { sortOption, collation } = sort
      ? getSortOption(sort)
      : { sortOption: { deletedAt: -1 }, collation: null };

    const options = {
      page,
      limit,
      sort: sortOption,
      collation: collation,
      populate: [{ path: "deletedBy", select: "name email" }],
    };

    return await paginateDeleted(Category, filter, options);
  },

  // === PUBLIC API METHODS ===

  /**
   * [PUBLIC] Lấy tất cả category (chỉ active và chưa xóa)
   */
  getPublicAllCategories: async () => {
    return await Category.find({ isActive: true, deletedAt: null })
      .select("-deletedBy -deletedAt")
      .sort("name")
      .collation(getVietnameseCollation());
  },

  /**
   * [PUBLIC] Lấy category theo ID (chỉ active và chưa xóa)
   */
  getPublicCategoryById: async (categoryId) => {
    const category = await Category.findOne({
      _id: categoryId,
      isActive: true,
      deletedAt: null, // Đảm bảo chỉ lấy category chưa xóa
    }).select("-deletedBy -deletedAt");

    if (!category) {
      throw new ApiError(404, `Không tìm thấy danh mục`);
    }

    return {
      success: true,
      category,
    };
  },

  /**
   * [PUBLIC] Lấy category theo slug (chỉ active và chưa xóa)
   */
  getCategoryBySlug: async (slug) => {
    const category = await Category.findOne({
      slug,
      isActive: true,
      deletedAt: null, // Đảm bảo chỉ lấy category chưa xóa
    }).select("-deletedBy -deletedAt");

    if (!category) {
      throw new ApiError(404, `Không tìm thấy danh mục`);
    }

    return {
      success: true,
      category,
    };
  },

  // === ADMIN OPERATIONS ===

  /**
   * Tạo category mới
   */
  createCategory: async (categoryData) => {
    // Đảm bảo isActive mặc định là true nếu không được cung cấp
    if (categoryData.isActive === undefined) {
      categoryData.isActive = true;
    }

    // Kiểm tra tên danh mục tồn tại
    const existingCategory = await Category.findOne({
      name: categoryData.name,
    });

    if (existingCategory) {
      throw new ApiError(409, `Tên danh mục ${categoryData.name} đã tồn tại`);
    }

    // Kiểm tra tên danh mục trùng với danh mục đã xóa
    const deletedCategory = await Category.findOne({
      name: categoryData.name,
      deletedAt: { $ne: null },
    });

    if (deletedCategory) {
      throw new ApiError(
        409,
        `Tên danh mục ${categoryData.name} đã tồn tại trong một danh mục đã xóa. Vui lòng khôi phục hoặc chọn tên khác.`
      );
    }

    const category = new Category(categoryData);

    // Lưu category — bắt lỗi duplicate key để trả về thông báo thân thiện
    try {
      await category.save();
    } catch (err) {
      // Mongo duplicate key error
      if (err && (err.code === 11000 || err.name === "MongoServerError")) {
        throw new ApiError(409, `Tên danh mục ${categoryData.name} đã tồn tại`);
      }
      throw err;
    }

    return {
      success: true,
      message: "Tạo danh mục thành công",
      category,
    };
  },

  /**
   * Cập nhật category
   */
  updateCategory: async (categoryId, categoryData) => {
    const category = await Category.findById(categoryId);

    if (!category) {
      throw new ApiError(404, `Không tìm thấy danh mục id: ${categoryId}`);
    }

    // Kiểm tra xem có cập nhật tên không và tên mới có trùng không
    if (categoryData.name && categoryData.name !== category.name) {
      // Kiểm tra cả bản ghi đã xóa mềm, sử dụng setOptions
      const existingCategory = await Category.findOne({
        name: categoryData.name,
        _id: { $ne: categoryId },
      }).setOptions({ includeDeleted: true });

      if (existingCategory) {
        // Xác định xem bản ghi trùng tên đã bị xóa mềm hay không
        if (existingCategory.deletedAt === null) {
          // Bản ghi chưa bị xóa - không cho phép đặt tên trùng
          throw new ApiError(
            409,
            `Tên danh mục ${categoryData.name} đã tồn tại`
          );
        } else {
          // Bản ghi đã bị xóa mềm - thông báo rõ hơn
          throw new ApiError(
            409,
            `Tên danh mục ${categoryData.name} đã tồn tại trong một danh mục đã xóa. Vui lòng khôi phục hoặc chọn tên khác.`
          );
        }
      }

      // Tự động tạo slug mới từ tên mới
      const newSlug = createSlug(categoryData.name);

      // Kiểm tra xem slug mới có bị trùng không (cả bản ghi chưa xóa mềm)
      const existingSlug = await Category.findOne({
        slug: newSlug,
        _id: { $ne: categoryId },
        deletedAt: null,
      });

      if (existingSlug) {
        // Nếu trùng, tạo slug với timestamp để đảm bảo duy nhất
        category.slug = `${newSlug}-${Date.now()}`;
      } else {
        // Nếu không trùng, sử dụng slug mới
        category.slug = newSlug;
      }
    }

    // Cập nhật từng trường
    if (categoryData.name !== undefined) category.name = categoryData.name;
    if (categoryData.description !== undefined)
      category.description = categoryData.description;
    if (categoryData.isActive !== undefined)
      category.isActive = categoryData.isActive;

    // Lưu danh mục — bắt lỗi duplicate key để trả về thông báo thân thiện
    try {
      await category.save();
    } catch (err) {
      if (err && (err.code === 11000 || err.name === "MongoServerError")) {
        throw new ApiError(409, `Tên danh mục ${categoryData.name} đã tồn tại`);
      }
      throw err;
    }

    return {
      success: true,
      message: `Cập nhật danh mục ${category.name} thành công`,
      category,
    };
  },
  /**
   * Xóa mềm category - với kiểm tra và tự động vô hiệu hóa
   */
  deleteCategory: async (categoryId, userId) => {
    const category = await Category.findById(categoryId);

    if (!category) {
      throw new ApiError(404, `Không tìm thấy danh mục id: ${categoryId}`);
    }

    // Kiểm tra xem category có được sử dụng trong sản phẩm nào không
    const productCount = await Product.countDocuments({ category: categoryId });

    // Nếu có sản phẩm liên kết, tự động vô hiệu hóa thay vì xóa
    if (productCount > 0) {
      // Vô hiệu hóa category và cập nhật cascade
      await categoryService.updateCategoryStatus(categoryId, false, true);

      return {
        success: true,
        message: `Danh mục được sử dụng trong ${productCount} sản phẩm nên đã được vô hiệu hóa thay vì xóa.`,
        isDeactivatedInstead: true,
        affectedProducts: productCount,
      };
    }

    // Nếu không có sản phẩm liên kết, tiến hành xóa mềm
    await category.softDelete(userId);

    return {
      success: true,
      message: `Xóa danh mục ${category.name} thành công`,
      isDeleted: true,
    };
  },

  /**
   * Khôi phục category đã xóa mềm - với hỗ trợ khôi phục cascade
   */
  restoreCategory: async (categoryId, cascade = true) => {
    // Sử dụng phương thức tĩnh restoreById từ plugin
    const category = await Category.restoreById(categoryId);

    if (!category) {
      throw new ApiError(
        404,
        `Không tìm thấy danh mục id: ${categoryId} hoặc danh mục không bị xóa`
      );
    }

    // Kích hoạt trạng thái category (vì restore chỉ xóa deletedAt mà không đổi isActive)
    category.isActive = true;
    await category.save();

    let affectedProducts = 0;
    let affectedVariants = 0;

    // CASCADE RESTORE: Kích hoạt các sản phẩm và biến thể liên quan
    if (cascade) {
      // Cập nhật sản phẩm thuộc category này
      const productResult = await Product.updateMany(
        { category: categoryId },
        { isActive: true }
      );
      affectedProducts = productResult.modifiedCount;

      // Cập nhật biến thể của sản phẩm thuộc category này
      const products = await Product.find({ category: categoryId }, { _id: 1 });
      const productIds = products.map((product) => product._id);

      if (productIds.length > 0) {
        const variantResult = await Variant.updateMany(
          { product: { $in: productIds } },
          { isActive: true }
        );
        affectedVariants = variantResult.modifiedCount;
      }
    }

    return {
      success: true,
      message: cascade
        ? `Khôi phục danh mục thành công. Đã kích hoạt ${affectedProducts} sản phẩm và ${affectedVariants} biến thể liên quan.`
        : "Khôi phục danh mục thành công mà không ảnh hưởng đến sản phẩm liên quan.",
      category,
      cascade: {
        applied: cascade,
        productsActivated: affectedProducts,
        variantsActivated: affectedVariants,
      },
    };
  },

  /**
   * Cập nhật trạng thái active của category
   * Thêm logic cascade để ẩn/hiện các sản phẩm và biến thể liên quan
   */
  updateCategoryStatus: async (categoryId, isActive, cascade = true) => {
    const category = await Category.findById(categoryId);

    if (!category) {
      throw new ApiError(404, `Không tìm thấy danh mục id: ${categoryId}`);
    }

    // Cập nhật trạng thái category
    category.isActive = isActive;
    await category.save();

    let affectedProducts = 0;
    let affectedVariants = 0;

    // CASCADE: Chỉ cập nhật sản phẩm và biến thể khi cascade = true
    if (cascade) {
      // Cập nhật trạng thái tất cả sản phẩm thuộc category này
      const updateProductResult = await Product.updateMany(
        { category: categoryId },
        { isActive: isActive }
      );
      affectedProducts = updateProductResult.modifiedCount;

      // CASCADE: Cập nhật trạng thái tất cả biến thể của các sản phẩm thuộc category này
      const products = await Product.find({ category: categoryId }, { _id: 1 });
      const productIds = products.map((product) => product._id);

      if (productIds.length > 0) {
        const variantResult = await Variant.updateMany(
          { product: { $in: productIds } },
          { isActive: isActive }
        );
        affectedVariants = variantResult.modifiedCount;
      }
    }

    const statusMsg = isActive ? "kích hoạt" : "vô hiệu hóa";
    return {
      success: true,
      message: cascade
        ? `Danh mục đã được ${statusMsg}. Đã ${statusMsg} ${affectedProducts} sản phẩm và ${affectedVariants} biến thể liên quan.`
        : `Danh mục đã được ${statusMsg} mà không ảnh hưởng đến sản phẩm.`,
      category,
      cascade: {
        applied: cascade,
        productsAffected: affectedProducts,
        variantsAffected: affectedVariants,
      },
    };
  },
};

module.exports = categoryService;
