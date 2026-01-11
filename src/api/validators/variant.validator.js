const { body, param, query } = require("express-validator");
const mongoose = require("mongoose");
const ApiError = require("@utils/ApiError");

const checkDuplicateSizes = (sizes) => {
  if (!sizes || !Array.isArray(sizes)) return true;

  const sizeIds = [];
  for (const item of sizes) {
    if (item && item.size) {
      sizeIds.push(String(item.size));
    }
  }

  const uniqueIds = new Set(sizeIds);
  if (uniqueIds.size !== sizeIds.length) {
    throw new ApiError(
      400,
      "Mỗi kích thước chỉ được xuất hiện một lần trong biến thể"
    );
  }

  return true;
};

const variantValidator = {
  // Kiểm tra ID biến thể
  validateVariantId: [
    param("id")
      .notEmpty()
      .withMessage("ID biến thể không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID biến thể không hợp lệ");
        }
        return true;
      }),
  ],

  // Kiểm tra dữ liệu tạo biến thể mới
  validateVariantData: [
    body("product")
      .notEmpty()
      .withMessage("ID sản phẩm không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID sản phẩm không hợp lệ");
        }
        return true;
      }),

    body("color")
      .notEmpty()
      .withMessage("ID màu sắc không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID màu sắc không hợp lệ");
        }
        return true;
      }),

    // REMOVED: price, costPrice, percentDiscount validators
    // Giá giờ được quản lý trong Inventory, không còn ở Variant

    body("gender")
      .optional()
      .isIn(["male", "female", "unisex"])
      .withMessage("Giới tính phải là 'male', 'female' hoặc 'unisex'"),

    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("Trạng thái active phải là boolean"),

    body("sizes")
      .isArray({ min: 1 })
      .withMessage("Phải có ít nhất một kích thước")
      .custom((sizes) => {
        // Validate từng element trong array
        if (!Array.isArray(sizes)) {
          throw new ApiError(400, "Sizes phải là một mảng");
        }

        for (let i = 0; i < sizes.length; i++) {
          const item = sizes[i];

          // Check item là object
          if (typeof item !== "object" || item === null) {
            throw new ApiError(
              400,
              `Phần tử thứ ${i + 1} trong sizes phải là một object`
            );
          }

          // Check có field size
          if (!item.size) {
            throw new ApiError(400, `Phần tử thứ ${i + 1} thiếu trường 'size'`);
          }

          // Check size là ObjectId hợp lệ
          if (!mongoose.Types.ObjectId.isValid(item.size)) {
            throw new ApiError(
              400,
              `ID kích thước tại vị trí ${i + 1} không hợp lệ`
            );
          }

          // REMOVED: quantity validation - quantity được quản lý trong Inventory
        }

        return true;
      })
      .custom(checkDuplicateSizes),

    body("sizes.*.size")
      .notEmpty()
      .withMessage("ID kích thước không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID kích thước không hợp lệ");
        }
        return true;
      }),

    // REMOVED: sizes.*.quantity validator - quantity được quản lý trong Inventory
  ],

  // Kiểm tra dữ liệu cập nhật biến thể
  validateUpdateVariant: [
    param("id")
      .notEmpty()
      .withMessage("ID biến thể không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID biến thể không hợp lệ");
        }
        return true;
      }),

    body("color")
      .optional()
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID màu sắc không hợp lệ");
        }
        return true;
      }),

    body("gender")
      .optional()
      .isIn(["male", "female", "unisex"])
      .withMessage("Giới tính phải là 'male', 'female' hoặc 'unisex'"),

    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("Trạng thái active phải là true hoặc false"),

    body("sizes")
      .optional()
      .isArray({ min: 1 })
      .withMessage("Phải có ít nhất một kích thước")
      .custom((sizes) => {
        // Validate từng element trong array nếu có sizes
        if (!sizes) return true; // optional

        if (!Array.isArray(sizes)) {
          throw new ApiError(400, "Sizes phải là một mảng");
        }

        for (let i = 0; i < sizes.length; i++) {
          const item = sizes[i];

          // Check item là object
          if (typeof item !== "object" || item === null) {
            throw new ApiError(
              400,
              `Phần tử thứ ${i + 1} trong sizes phải là một object`
            );
          }

          // Check có field size
          if (!item.size) {
            throw new ApiError(400, `Phần tử thứ ${i + 1} thiếu trường 'size'`);
          }

          // Check size là ObjectId hợp lệ
          if (!mongoose.Types.ObjectId.isValid(item.size)) {
            throw new ApiError(
              400,
              `ID kích thước tại vị trí ${i + 1} không hợp lệ`
            );
          }

          // REMOVED: quantity validation - quantity được quản lý trong Inventory
        }

        return true;
      })
      .custom(checkDuplicateSizes),

    body("sizes.*.size")
      .optional()
      .notEmpty()
      .withMessage("ID kích thước không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID kích thước không hợp lệ");
        }
        return true;
      }),

    // REMOVED: sizes.*.quantity validator - quantity được quản lý trong Inventory
  ],

  // Kiểm tra query lấy danh sách biến thể
  validateVariantQuery: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Trang phải là số nguyên dương"),

    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Giới hạn phải là số nguyên từ 1-100"),

    query("productId")
      .optional()
      .custom((value) => {
        if (value && !mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID sản phẩm không hợp lệ");
        }
        return true;
      }),

    query("color")
      .optional()
      .custom((value) => {
        if (value && !mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID màu sắc không hợp lệ");
        }
        return true;
      }),

    query("gender")
      .optional()
      .isIn(["male", "female", "unisex"])
      .withMessage("Giới tính phải là 'male', 'female' hoặc 'unisex'"),

    // REMOVED: Validators cho giá (costPriceMin/Max, priceMin/Max, finalPriceMin/Max)
    // Giá giờ được quản lý trong Inventory, không filter theo giá ở Variant

    query("isActive")
      .optional()
      .isIn(["true", "false"])
      .withMessage("Trạng thái active không hợp lệ"),

    query("sort")
      .optional()
      .isString()
      .withMessage("Chuỗi sắp xếp phải là chuỗi")
      .custom((value) => {
        try {
          JSON.parse(value);
          return true;
        } catch (error) {
          throw new ApiError(400, "Chuỗi sắp xếp không hợp lệ");
        }
      }),
  ],

  // Kiểm tra trạng thái active
  validateStatusUpdate: [
    param("id")
      .notEmpty()
      .withMessage("ID biến thể không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID biến thể không hợp lệ");
        }
        return true;
      }),

    body("isActive")
      .notEmpty()
      .withMessage("Trạng thái active không được để trống")
      .isBoolean()
      .withMessage("Trạng thái active phải là true hoặc false"),
  ],
};

module.exports = variantValidator;
