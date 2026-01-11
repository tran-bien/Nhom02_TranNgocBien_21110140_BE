const { query } = require("express-validator");
const mongoose = require("mongoose");
const ApiError = require("@utils/ApiError");

const compareValidator = {
  // Validate compare variants
  validateCompareVariants: [
    query("variantIds")
      .notEmpty()
      .withMessage("Danh sách variant IDs không được để trống")
      .isString()
      .withMessage("Danh sách variant IDs phải là chuỗi")
      .custom((value) => {
        const ids = value.split(",").filter(id => id.trim());
        
        if (ids.length < 2) {
          throw new ApiError(400, "Cần ít nhất 2 biến thể để so sánh");
        }

        if (ids.length > 3) {
          throw new ApiError(400, "Chỉ được so sánh tối đa 3 biến thể");
        }

        // Validate mỗi ID
        for (const id of ids) {
          if (!mongoose.Types.ObjectId.isValid(id.trim())) {
            throw new ApiError(400, `ID biến thể không hợp lệ: ${id}`);
          }
        }

        return true;
      }),
  ],

  // Validate compare products
  validateCompareProducts: [
    query("productIds")
      .notEmpty()
      .withMessage("Danh sách product IDs không được để trống")
      .isString()
      .withMessage("Danh sách product IDs phải là chuỗi")
      .custom((value) => {
        const ids = value.split(",").filter(id => id.trim());
        
        if (ids.length < 2) {
          throw new ApiError(400, "Cần ít nhất 2 sản phẩm để so sánh");
        }

        if (ids.length > 3) {
          throw new ApiError(400, "Chỉ được so sánh tối đa 3 sản phẩm");
        }

        // Validate mỗi ID
        for (const id of ids) {
          if (!mongoose.Types.ObjectId.isValid(id.trim())) {
            throw new ApiError(400, `ID sản phẩm không hợp lệ: ${id}`);
          }
        }

        return true;
      }),
  ],
};

module.exports = compareValidator;

