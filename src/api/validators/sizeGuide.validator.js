const { body, param } = require("express-validator");
const mongoose = require("mongoose");
const ApiError = require("@utils/ApiError");

const sizeGuideValidator = {
  // Validate productId param
  validateProductId: [
    param("productId")
      .notEmpty()
      .withMessage("ID sản phẩm không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID sản phẩm không hợp lệ");
        }
        return true;
      }),
  ],

  // Validate sizeGuideId param
  validateSizeGuideId: [
    param("id")
      .notEmpty()
      .withMessage("ID size guide không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID size guide không hợp lệ");
        }
        return true;
      }),
  ],

  // Validate create size guide
  // NOTE: Ảnh sẽ được upload sau qua API riêng, không validate ở đây
  validateCreateSizeGuide: [
    body("productId")
      .notEmpty()
      .withMessage("ID sản phẩm không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID sản phẩm không hợp lệ");
        }
        return true;
      }),

    body("sizeChart")
      .optional()
      .isObject()
      .withMessage("Size chart phải là object"),

    body("sizeChart.description")
      .optional()
      .isString()
      .withMessage("Mô tả size chart phải là chuỗi")
      .isLength({ max: 5000 })
      .withMessage("Mô tả size chart không được vượt quá 5000 ký tự"),

    body("measurementGuide")
      .optional()
      .isObject()
      .withMessage("Measurement guide phải là object"),

    body("measurementGuide.description")
      .optional()
      .isString()
      .withMessage("Mô tả measurement guide phải là chuỗi")
      .isLength({ max: 5000 })
      .withMessage("Mô tả measurement guide không được vượt quá 5000 ký tự"),

    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("Trạng thái active phải là boolean"),
  ],

  // Validate update size guide
  validateUpdateSizeGuide: [
    body("sizeChart")
      .optional()
      .isObject()
      .withMessage("Size chart phải là object"),

    body("sizeChart.description")
      .optional()
      .isString()
      .withMessage("Mô tả size chart phải là chuỗi")
      .isLength({ max: 5000 })
      .withMessage("Mô tả size chart không được vượt quá 5000 ký tự"),

    body("measurementGuide")
      .optional()
      .isObject()
      .withMessage("Measurement guide phải là object"),

    body("measurementGuide.description")
      .optional()
      .isString()
      .withMessage("Mô tả measurement guide phải là chuỗi")
      .isLength({ max: 5000 })
      .withMessage("Mô tả measurement guide không được vượt quá 5000 ký tự"),

    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("Trạng thái active phải là boolean"),
  ],
};

module.exports = sizeGuideValidator;

