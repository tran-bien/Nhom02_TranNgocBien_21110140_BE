const { body, param, query } = require("express-validator");
const mongoose = require("mongoose");
const ApiError = require("@utils/ApiError");

const blogValidator = {
  // Validate blogPostId param
  validateBlogPostId: [
    param("id")
      .notEmpty()
      .withMessage("ID bài viết không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID bài viết không hợp lệ");
        }
        return true;
      }),
  ],

  // Validate slug param
  validateSlug: [
    param("slug")
      .notEmpty()
      .withMessage("Slug không được để trống")
      .isString()
      .withMessage("Slug phải là chuỗi")
      .isLength({ min: 3, max: 200 })
      .withMessage("Slug phải có từ 3-200 ký tự"),
  ],

  // Validate blockId param
  validateBlockId: [
    param("blockId")
      .notEmpty()
      .withMessage("ID block không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID block không hợp lệ");
        }
        return true;
      }),
  ],

  // Validate create blog post
  validateCreateBlogPost: [
    body("title")
      .notEmpty()
      .withMessage("Tiêu đề không được để trống")
      .isString()
      .withMessage("Tiêu đề phải là chuỗi")
      .isLength({ min: 5, max: 200 })
      .withMessage("Tiêu đề phải có từ 5-200 ký tự"),

    body("excerpt")
      .optional()
      .isString()
      .withMessage("Mô tả ngắn phải là chuỗi")
      .isLength({ max: 500 })
      .withMessage("Mô tả ngắn không được vượt quá 500 ký tự"),

    body("content")
      .notEmpty()
      .withMessage("Nội dung không được để trống")
      .isString()
      .withMessage("Nội dung phải là chuỗi")
      .isLength({ max: 50000 })
      .withMessage("Nội dung không được vượt quá 50000 ký tự"),

    body("category")
      .optional()
      .custom((value) => {
        if (value && !mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID danh mục không hợp lệ");
        }
        return true;
      }),

    body("tags").optional().isArray().withMessage("Tags phải là mảng"),

    body("tags.*")
      .optional()
      .isString()
      .withMessage("Tag phải là chuỗi")
      .isLength({ max: 50 })
      .withMessage("Tag không được vượt quá 50 ký tự"),

    body("status")
      .optional()
      .isIn(["DRAFT", "PUBLISHED", "ARCHIVED"])
      .withMessage("Trạng thái phải là DRAFT, PUBLISHED hoặc ARCHIVED"),

    body("metaTitle")
      .optional()
      .isString()
      .withMessage("Meta title phải là chuỗi")
      .isLength({ max: 200 })
      .withMessage("Meta title không được vượt quá 200 ký tự"),

    body("metaDescription")
      .optional()
      .isString()
      .withMessage("Meta description phải là chuỗi")
      .isLength({ max: 500 })
      .withMessage("Meta description không được vượt quá 500 ký tự"),

    body("metaKeywords")
      .optional()
      .isArray()
      .withMessage("Meta keywords phải là mảng"),
  ],

  // Validate update blog post
  validateUpdateBlogPost: [
    body("title")
      .optional()
      .isString()
      .withMessage("Tiêu đề phải là chuỗi")
      .isLength({ min: 5, max: 500 })
      .withMessage("Tiêu đề phải có từ 5-500 ký tự"),

    body("excerpt")
      .optional()
      .isString()
      .withMessage("Mô tả ngắn phải là chuỗi")
      .isLength({ max: 500 })
      .withMessage("Mô tả ngắn không được vượt quá 500 ký tự"),

    body("content")
      .optional()
      .isString()
      .withMessage("Nội dung phải là chuỗi")
      .isLength({ max: 50000 })
      .withMessage("Nội dung không được vượt quá 50000 ký tự"),

    body("category")
      .optional()
      .custom((value) => {
        if (value && !mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID danh mục không hợp lệ");
        }
        return true;
      }),

    body("tags").optional().isArray().withMessage("Tags phải là mảng"),

    body("status")
      .optional()
      .isIn(["DRAFT", "PUBLISHED", "ARCHIVED"])
      .withMessage("Trạng thái phải là DRAFT, PUBLISHED hoặc ARCHIVED"),

    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("Trạng thái active phải là boolean"),
  ],

  // Validate blog post query
  validateBlogPostQuery: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Trang phải là số nguyên dương"),

    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Giới hạn phải là số nguyên từ 1-100"),

    query("search")
      .optional()
      .isString()
      .withMessage("Từ khóa tìm kiếm phải là chuỗi"),

    query("category")
      .optional()
      .custom((value) => {
        if (value && !mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID danh mục không hợp lệ");
        }
        return true;
      }),

    query("status")
      .optional()
      .isIn(["DRAFT", "PUBLISHED", "ARCHIVED"])
      .withMessage("Trạng thái phải là DRAFT, PUBLISHED hoặc ARCHIVED"),

    query("tag").optional().isString().withMessage("Tag phải là chuỗi"),

    query("sort")
      .optional()
      .isIn(["newest", "oldest", "popular"])
      .withMessage("Kiểu sắp xếp không hợp lệ"),
  ],

  // Validate blogCategoryId param
  validateBlogCategoryId: [
    param("id")
      .notEmpty()
      .withMessage("ID danh mục không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID danh mục không hợp lệ");
        }
        return true;
      }),
  ],

  // Validate create blog category
  validateCreateBlogCategory: [
    body("name")
      .notEmpty()
      .withMessage("Tên danh mục không được để trống")
      .isString()
      .withMessage("Tên danh mục phải là chuỗi")
      .isLength({ min: 2, max: 500 })
      .withMessage("Tên danh mục phải có từ 2-500 ký tự"),

    body("description")
      .optional()
      .isString()
      .withMessage("Mô tả phải là chuỗi")
      .isLength({ max: 5000 })
      .withMessage("Mô tả không được vượt quá 5000 ký tự"),

    body("displayOrder")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Thứ tự hiển thị phải là số nguyên không âm"),

    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("Trạng thái active phải là boolean"),
  ],

  // Validate update blog category
  validateUpdateBlogCategory: [
    body("name")
      .optional()
      .isString()
      .withMessage("Tên danh mục phải là chuỗi")
      .isLength({ min: 2, max: 500 })
      .withMessage("Tên danh mục phải có từ 2-500 ký tự"),

    body("description")
      .optional()
      .isString()
      .withMessage("Mô tả phải là chuỗi")
      .isLength({ max: 5000 })
      .withMessage("Mô tả không được vượt quá 5000 ký tự"),

    body("displayOrder")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Thứ tự hiển thị phải là số nguyên không âm"),

    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("Trạng thái active phải là boolean"),
  ],
};

module.exports = blogValidator;
