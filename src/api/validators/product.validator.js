const { body, param, query } = require("express-validator");
const mongoose = require("mongoose");
const ApiError = require("@utils/ApiError");

const productValidator = {
  // Kiểm tra ID sản phẩm
  validateProductId: [
    param("id")
      .notEmpty()
      .withMessage("ID sản phẩm không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID sản phẩm không hợp lệ");
        }
        return true;
      }),
  ],

  // Kiểm tra slug sản phẩm
  validateProductSlug: [
    param("slug")
      .notEmpty()
      .withMessage("Slug sản phẩm không được để trống")
      .isString()
      .withMessage("Slug sản phẩm phải là chuỗi")
      .isLength({ min: 3, max: 100 })
      .withMessage("Slug sản phẩm phải có từ 3-100 ký tự"),
  ],

  // Kiểm tra dữ liệu tạo sản phẩm
  validateCreateProduct: [
    body("name")
      .notEmpty()
      .withMessage("Tên sản phẩm không được để trống")
      .isString()
      .withMessage("Tên sản phẩm phải là chuỗi")
      .isLength({ min: 2, max: 200 })
      .withMessage("Tên sản phẩm phải có từ 2-200 ký tự"),

    body("description")
      .notEmpty()
      .withMessage("Mô tả sản phẩm không được để trống")
      .isString()
      .withMessage("Mô tả sản phẩm phải là chuỗi")
      .isLength({ min: 10, max: 10000 })
      .withMessage("Mô tả sản phẩm phải có từ 10-10000 ký tự"),

    body("category")
      .notEmpty()
      .withMessage("Danh mục sản phẩm không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID danh mục không hợp lệ");
        }
        return true;
      }),

    body("brand")
      .notEmpty()
      .withMessage("Thương hiệu sản phẩm không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID thương hiệu không hợp lệ");
        }
        return true;
      }),

    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("Trạng thái active phải là boolean"),
  ],

  // Kiểm tra dữ liệu cập nhật sản phẩm
  validateUpdateProduct: [
    param("id")
      .notEmpty()
      .withMessage("ID sản phẩm không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID sản phẩm không hợp lệ");
        }
        return true;
      }),

    body("name")
      .optional()
      .isString()
      .withMessage("Tên sản phẩm phải là chuỗi")
      .isLength({ min: 2, max: 200 })
      .withMessage("Tên sản phẩm phải có từ 2-200 ký tự"),

    body("description")
      .optional()
      .isString()
      .withMessage("Mô tả sản phẩm phải là chuỗi")
      .isLength({ min: 10, max: 10000 })
      .withMessage("Mô tả sản phẩm phải có từ 10-10000 ký tự"),

    body("category")
      .optional()
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID danh mục không hợp lệ");
        }
        return true;
      }),

    body("brand")
      .optional()
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID thương hiệu không hợp lệ");
        }
        return true;
      }),

    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("Trạng thái active phải là true hoặc false"),
  ],

  // Kiểm tra query admin products
  validateAdminProductQuery: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Trang phải là số nguyên dương"),

    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Giới hạn phải là số nguyên từ 1-100"),

    query("name")
      .optional()
      .isString()
      .withMessage("Tên sản phẩm phải là chuỗi"),

    query("category")
      .optional()
      .custom((value) => {
        if (value && !mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID danh mục không hợp lệ");
        }
        return true;
      }),

    query("brand")
      .optional()
      .custom((value) => {
        if (value && !mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID thương hiệu không hợp lệ");
        }
        return true;
      }),

    query("minPrice")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Giá tối thiểu phải là số nguyên không âm"),

    query("maxPrice")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Giá tối đa phải là số nguyên không âm")
      .custom((value, { req }) => {
        if (req.query.minPrice && Number(value) < Number(req.query.minPrice)) {
          throw new ApiError(
            400,
            "Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu"
          );
        }
        return true;
      }),

    query("stockStatus")
      .optional()
      .isIn(["in_stock", "low_stock", "out_of_stock"])
      .withMessage("Trạng thái tồn kho không hợp lệ"),

    query("isActive")
      .optional()
      .isIn(["true", "false"])
      .withMessage("Trạng thái active không hợp lệ"),

    query("sort")
      .optional()
      .isIn(["created_at_asc", "created_at_desc", "name_asc", "name_desc"])
      .withMessage("Kiểu sắp xếp không hợp lệ"),
  ],

  // Kiểm tra query public products
  validatePublicProductQuery: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Trang phải là số nguyên dương"),

    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Giới hạn phải là số nguyên từ 1-100"),

    query("name")
      .optional()
      .isString()
      .withMessage("Tên sản phẩm phải là chuỗi"),

    query("category")
      .optional()
      .custom((value) => {
        if (value && !mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID danh mục không hợp lệ");
        }
        return true;
      }),

    query("brand")
      .optional()
      .custom((value) => {
        if (value && !mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID thương hiệu không hợp lệ");
        }
        return true;
      }),

    query("minPrice")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Giá tối thiểu phải là số nguyên không âm"),

    query("maxPrice")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Giá tối đa phải là số nguyên không âm")
      .custom((value, { req }) => {
        if (req.query.minPrice && Number(value) < Number(req.query.minPrice)) {
          throw new ApiError(
            400,
            "Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu"
          );
        }
        return true;
      }),

    query("colors")
      .optional()
      .isString()
      .withMessage("Danh sách màu sắc phải là chuỗi")
      .custom((value) => {
        const colorIds = value.split(",");
        for (const id of colorIds) {
          if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new ApiError(400, "ID màu sắc không hợp lệ");
          }
        }
        return true;
      }),

    query("sizes")
      .optional()
      .isString()
      .withMessage("Danh sách kích thước phải là chuỗi")
      .custom((value) => {
        const sizeIds = value.split(",");
        for (const id of sizeIds) {
          if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new ApiError(400, "ID kích thước không hợp lệ");
          }
        }
        return true;
      }),

    query("gender")
      .optional()
      .isIn(["male", "female", "unisex"])
      .withMessage("Giới tính phải là male, female hoặc unisex"),

    query("sort")
      .optional()
      .isIn(["newest", "price-asc", "price-desc", "popular", "rating"])
      .withMessage("Kiểu sắp xếp không hợp lệ"),
  ],

  // Kiểm tra dữ liệu cập nhật trạng thái
  validateStatusUpdate: [
    param("id")
      .notEmpty()
      .withMessage("ID sản phẩm không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID sản phẩm không hợp lệ");
        }
        return true;
      }),

    body("isActive")
      .notEmpty()
      .withMessage("Trạng thái active không được để trống")
      .isBoolean()
      .withMessage("Trạng thái active phải là true hoặc false"),

    body("cascade")
      .optional()
      .isBoolean()
      .withMessage("Cascade phải là true hoặc false"),
  ],
};

module.exports = productValidator;
