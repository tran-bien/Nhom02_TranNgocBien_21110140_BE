const { body, param, query } = require("express-validator");
const ApiError = require("@utils/ApiError");
const colorValidator = {
  validateColorId: [
    param("id").isMongoId().withMessage("ID màu sắc không hợp lệ"),
  ],

  validateCreateColor: [
    body("name")
      .notEmpty()
      .withMessage("Tên màu là bắt buộc")
      .isString()
      .withMessage("Tên màu phải là chuỗi")
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Tên màu phải từ 1 đến 50 ký tự"),

    body("type")
      .notEmpty()
      .withMessage("Loại màu là bắt buộc")
      .isIn(["solid", "half"])
      .withMessage("Loại màu phải là 'solid' hoặc 'half'"),

    // Kiểm tra match giữa type và thuộc tính màu
    body().custom((value) => {
      // Đảm bảo rằng nếu type là 'solid' thì phải có code
      if (value.type === "solid" && !value.code) {
        throw new ApiError(400, "Màu đơn (solid) phải có mã màu (code)");
      }

      // Đảm bảo rằng nếu type là 'half' thì phải có mảng colors
      if (
        value.type === "half" &&
        (!value.colors || !Array.isArray(value.colors))
      ) {
        throw new ApiError(
          400,
          "Màu kết hợp (half) phải có danh sách màu (colors)"
        );
      }

      // Đảm bảo rằng nếu type là 'solid' thì KHÔNG được có mảng colors
      if (value.type === "solid" && value.colors) {
        throw new ApiError(
          400,
          "Màu đơn (solid) không được có danh sách màu (colors)"
        );
      }

      // Đảm bảo rằng nếu type là 'half' thì KHÔNG được có code
      if (value.type === "half" && value.code) {
        throw new ApiError(
          400,
          "Màu kết hợp (half) không được có mã màu đơn (code)"
        );
      }

      return true;
    }),

    body("code")
      .optional()
      .isString()
      .withMessage("Mã màu phải là chuỗi")
      .custom((value) => {
        // Kiểm tra mã hex hợp lệ (với hoặc không có # ở đầu)
        const regex = /^#?([0-9A-F]{6}|[0-9A-F]{3})$/i;
        if (value && !regex.test(value)) {
          throw new ApiError(
            400,
            "Mã màu không hợp lệ (yêu cầu định dạng HEX)"
          );
        }
        return true;
      }),

    body("colors").custom((value, { req }) => {
      // Kiểm tra nếu type = half thì phải có đúng 2 mã màu
      if (req.body.type === "half") {
        if (!Array.isArray(value) || value.length !== 2) {
          throw new ApiError(400, "Màu kết hợp (half) phải có đúng 2 mã màu");
        }

        // Kiểm tra mỗi mã màu trong array
        const regex = /^#?([0-9A-F]{6}|[0-9A-F]{3})$/i;
        if (!value.every((color) => regex.test(color))) {
          throw new ApiError(
            400,
            "Mã màu không hợp lệ (yêu cầu định dạng HEX)"
          );
        }
      }
      return true;
    }),
  ],

  validateUpdateColor: [
    param("id").isMongoId().withMessage("ID màu sắc không hợp lệ"),

    body("name")
      .optional()
      .isString()
      .withMessage("Tên màu phải là chuỗi")
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Tên màu phải từ 1 đến 50 ký tự"),

    // Kiểm tra nếu update thay đổi type thì cũng phải thay đổi code/colors cho phù hợp
    body().custom((value) => {
      // Nếu thay đổi type thành solid mà không cung cấp code
      if (value.type === "solid" && !value.code && value.colors) {
        throw new ApiError(
          400,
          "Khi chuyển sang màu đơn (solid) phải cung cấp mã màu (code) và không có colors"
        );
      }

      // Nếu thay đổi type thành half mà không cung cấp colors
      if (value.type === "half" && value.code && !value.colors) {
        throw new ApiError(
          400,
          "Khi chuyển sang màu kết hợp (half) phải cung cấp danh sách màu (colors) và không có code"
        );
      }

      // Nếu type là solid thì không được cập nhật colors
      if (value.type === "solid" && value.colors) {
        throw new ApiError(
          400,
          "Màu đơn (solid) không được có danh sách màu (colors)"
        );
      }

      // Nếu type là half thì không được cập nhật code
      if (value.type === "half" && value.code) {
        throw new ApiError(
          400,
          "Màu kết hợp (half) không được có mã màu đơn (code)"
        );
      }

      return true;
    }),

    body("type")
      .optional()
      .isIn(["solid", "half"])
      .withMessage("Loại màu phải là 'solid' hoặc 'half'"),

    body("code")
      .optional()
      .isString()
      .withMessage("Mã màu phải là chuỗi")
      .custom((value) => {
        // Kiểm tra mã hex hợp lệ
        const regex = /^#?([0-9A-F]{6}|[0-9A-F]{3})$/i;
        if (value && !regex.test(value)) {
          throw new ApiError(
            400,
            "Mã màu không hợp lệ (yêu cầu định dạng HEX)"
          );
        }
        return true;
      }),

    body("colors")
      .optional()
      .custom((value, { req }) => {
        // Nếu có type và type = half, hoặc nếu không có type trong req nhưng colors có (cập nhật riêng colors)
        if (req.body.type === "half" || (!req.body.type && value)) {
          if (!Array.isArray(value) || value.length !== 2) {
            throw new ApiError(400, "Màu kết hợp (half) phải có đúng 2 mã màu");
          }

          // Kiểm tra mỗi mã màu trong array
          const regex = /^#?([0-9A-F]{6}|[0-9A-F]{3})$/i;
          if (!value.every((color) => regex.test(color))) {
            throw new ApiError(
              400,
              "Mã màu không hợp lệ (yêu cầu định dạng HEX)"
            );
          }
        }
        return true;
      }),
  ],

  validateListQuery: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Số trang phải là số nguyên dương")
      .toInt(),

    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Số lượng hiển thị phải từ 1 đến 100")
      .toInt(),

    query("name")
      .optional()
      .isString()
      .withMessage("Tên màu tìm kiếm phải là chuỗi"),

    query("type")
      .optional()
      .isIn(["solid", "half"])
      .withMessage("Loại màu phải là 'solid' hoặc 'half'"),

    query("sort")
      .optional()
      .isIn(["created_at_asc", "created_at_desc", "name_asc", "name_desc"])
      .withMessage("Tham số sắp xếp không hợp lệ"),
  ],
};

module.exports = colorValidator;
