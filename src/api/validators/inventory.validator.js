const { body, param, query } = require("express-validator");
const mongoose = require("mongoose");

/**
 * Validator cho nhập kho
 */
exports.validateStockIn = [
  body("productId")
    .notEmpty()
    .withMessage("Product ID không được để trống")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Product ID không hợp lệ");
      }
      return true;
    }),

  body("variantId")
    .notEmpty()
    .withMessage("Variant ID không được để trống")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Variant ID không hợp lệ");
      }
      return true;
    }),

  body("sizeId")
    .notEmpty()
    .withMessage("Size ID không được để trống")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Size ID không hợp lệ");
      }
      return true;
    }),

  body("quantity")
    .notEmpty()
    .withMessage("Số lượng không được để trống")
    .isInt({ min: 1 })
    .withMessage("Số lượng phải là số nguyên dương"),

  body("costPrice")
    .notEmpty()
    .withMessage("Giá nhập không được để trống")
    .isFloat({ min: 0.01 })
    .withMessage("Giá nhập phải lớn hơn 0"),

  body("targetProfitPercent")
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage("% Lợi nhuận phải từ 0-1000"),

  body("percentDiscount")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("% Giảm giá phải từ 0-100"),

  body("note").optional().isString().withMessage("Ghi chú phải là chuỗi"),
];

/**
 * Validator cho xuất kho
 */
exports.validateStockOut = [
  body("productId")
    .notEmpty()
    .withMessage("Product ID không được để trống")
    .isMongoId()
    .withMessage("Product ID không hợp lệ"),

  body("variantId")
    .notEmpty()
    .withMessage("Variant ID không được để trống")
    .isMongoId()
    .withMessage("Variant ID không hợp lệ"),

  body("sizeId")
    .notEmpty()
    .withMessage("Size ID không được để trống")
    .isMongoId()
    .withMessage("Size ID không hợp lệ"),

  body("quantity")
    .notEmpty()
    .withMessage("Số lượng không được để trống")
    .isInt({ min: 1 })
    .withMessage("Số lượng phải là số nguyên dương"),

  body("reason")
    .optional()
    .isString()
    .isIn([
      "restock",
      "manual",
      "sale",
      "return",
      "damage",
      "lost",
      "adjustment",
      "other",
    ])
    .withMessage("Lý do xuất kho không hợp lệ"),

  body("note").optional().isString(),
];

/**
 * Validator cho điều chỉnh kho
 */
exports.validateAdjustStock = [
  body("productId")
    .notEmpty()
    .withMessage("Product ID không được để trống")
    .isMongoId()
    .withMessage("Product ID không hợp lệ"),

  body("variantId")
    .notEmpty()
    .withMessage("Variant ID không được để trống")
    .isMongoId()
    .withMessage("Variant ID không hợp lệ"),

  body("sizeId")
    .notEmpty()
    .withMessage("Size ID không được để trống")
    .isMongoId()
    .withMessage("Size ID không hợp lệ"),

  body("newQuantity")
    .notEmpty()
    .withMessage("Số lượng mới không được để trống")
    .isInt({ min: 0 })
    .withMessage("Số lượng mới phải >= 0"),

  body("reason")
    .optional()
    .isString()
    .isIn([
      "restock",
      "manual",
      "sale",
      "return",
      "damage",
      "lost",
      "adjustment",
      "other",
    ])
    .withMessage("Lý do điều chỉnh không hợp lệ"),

  body("note").optional().isString(),
];

/**
 * Validator cho tính giá
 */
exports.validateCalculatePrice = [
  body("costPrice")
    .notEmpty()
    .withMessage("Giá vốn không được để trống")
    .isFloat({ min: 0 })
    .withMessage("Giá vốn phải >= 0"),

  body("targetProfitPercent")
    .notEmpty()
    .withMessage("% Lợi nhuận không được để trống")
    .isFloat({ min: 0, max: 1000 })
    .withMessage("% Lợi nhuận phải từ 0-1000"),

  body("percentDiscount")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("% Giảm giá phải từ 0-100"),
];

/**
 * Validator cho update low stock threshold
 */
exports.validateUpdateThreshold = [
  param("id")
    .notEmpty()
    .withMessage("Inventory ID không được để trống")
    .isMongoId()
    .withMessage("Inventory ID không hợp lệ"),

  body("lowStockThreshold")
    .notEmpty()
    .withMessage("Ngưỡng cảnh báo không được để trống")
    .isInt({ min: 0 })
    .withMessage("Ngưỡng cảnh báo phải >= 0"),
];

/**
 * Validator cho query danh sách
 */
exports.validateGetInventory = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Số trang phải là số nguyên dương"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Số lượng mỗi trang phải từ 1-100"),

  query("productId")
    .optional()
    .isMongoId()
    .withMessage("Product ID không hợp lệ"),

  query("lowStock")
    .optional()
    .isIn(["true", "false"])
    .withMessage("lowStock phải là true hoặc false"),

  query("outOfStock")
    .optional()
    .isIn(["true", "false"])
    .withMessage("outOfStock phải là true hoặc false"),

  query("sortBy")
    .optional()
    .isIn(["quantity", "costPrice", "averageCostPrice", "createdAt"])
    .withMessage("sortBy không hợp lệ"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder phải là asc hoặc desc"),
];

/**
 * Validator cho lấy giao dịch
 */
exports.validateGetTransactions = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Số trang phải là số nguyên dương"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Số lượng mỗi trang phải từ 1-100"),

  query("type")
    .optional()
    .isIn(["IN", "OUT", "ADJUST"])
    .withMessage("Type phải là: IN, OUT, hoặc ADJUST"),

  query("productId")
    .optional()
    .isMongoId()
    .withMessage("Product ID không hợp lệ"),

  query("variantId")
    .optional()
    .isMongoId()
    .withMessage("Variant ID không hợp lệ"),

  query("sizeId").optional().isMongoId().withMessage("Size ID không hợp lệ"),

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate phải là ISO 8601 date"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate phải là ISO 8601 date"),
];

/**
 * Validator cho ID params
 */
exports.validateInventoryId = [
  param("id")
    .notEmpty()
    .withMessage("Inventory ID không được để trống")
    .isMongoId()
    .withMessage("Inventory ID không hợp lệ"),
];
