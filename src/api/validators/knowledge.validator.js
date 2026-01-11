const { body, param, query } = require("express-validator");

/**
 * Validator cho lấy danh sách knowledge documents
 */
const validateGetAllDocuments = [
  query("category")
    .optional()
    .isIn([
      "category_info",
      "policy",
      "faq",
      "brand_info",
      "product_info",
      "how_to_size",
    ])
    .withMessage("Category không hợp lệ"),

  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive phải là boolean"),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search query không được quá 100 ký tự"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page phải là số nguyên dương"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit phải từ 1-100"),
];

/**
 * Validator cho lấy document theo ID
 */
const validateGetDocumentById = [
  param("id").isMongoId().withMessage("ID không hợp lệ"),
];

/**
 * Validator cho tạo document
 */
const validateCreateDocument = [
  body("category")
    .isIn([
      "category_info",
      "policy",
      "faq",
      "brand_info",
      "product_info",
      "how_to_size",
    ])
    .withMessage(
      "Category phải là: category_info, policy, faq, brand_info, product_info, how_to_size"
    ),

  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title không được để trống")
    .isLength({ max: 200 })
    .withMessage("Title không được quá 200 ký tự"),

  body("content")
    .trim()
    .notEmpty()
    .withMessage("Content không được để trống")
    .isLength({ max: 5000 })
    .withMessage("Content không được quá 5000 ký tự"),

  body("tags").optional().isArray().withMessage("Tags phải là mảng"),

  body("tags.*")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Mỗi tag không được quá 50 ký tự"),

  body("priority")
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage("Priority phải từ 1-10"),
];

/**
 * Validator cho cập nhật document
 */
const validateUpdateDocument = [
  param("id").isMongoId().withMessage("ID không hợp lệ"),

  body("category")
    .optional()
    .isIn([
      "category_info",
      "policy",
      "faq",
      "brand_info",
      "product_info",
      "how_to_size",
    ])
    .withMessage("Category không hợp lệ"),

  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title không được để trống")
    .isLength({ max: 200 })
    .withMessage("Title không được quá 200 ký tự"),

  body("content")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Content không được để trống")
    .isLength({ max: 5000 })
    .withMessage("Content không được quá 5000 ký tự"),

  body("tags").optional().isArray().withMessage("Tags phải là mảng"),

  body("priority")
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage("Priority phải từ 1-10"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive phải là boolean"),
];

/**
 * Validator cho xóa document
 */
const validateDeleteDocument = [
  param("id").isMongoId().withMessage("ID không hợp lệ"),
];

/**
 * Validator cho import Excel
 */
const validateExcelImport = [
  body("skipDuplicates")
    .optional()
    .isBoolean()
    .withMessage("skipDuplicates phải là boolean"),
];

module.exports = {
  validateGetAllDocuments,
  validateGetDocumentById,
  validateCreateDocument,
  validateUpdateDocument,
  validateDeleteDocument,
  validateExcelImport,
};
