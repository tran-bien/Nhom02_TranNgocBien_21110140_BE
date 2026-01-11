const mongoose = require("mongoose");
const ApiError = require("@utils/ApiError");

/**
 * Áp dụng middleware cho Tag Schema
 * @param {mongoose.Schema} schema - Schema để áp dụng middleware
 */
const applyMiddlewares = (schema) => {
  // Middleware kiểm tra trước khi xóa - không cho phép xóa nếu đang được sử dụng
  schema.pre("deleteOne", { document: true }, async function (next) {
    try {
      const Product = mongoose.model("Product");
      const count = await Product.countDocuments({
        tags: this._id,
        deletedAt: null,
      });

      if (count > 0) {
        throw new ApiError(
          400,
          `Không thể xóa tag này vì có ${count} sản phẩm đang sử dụng`
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  });

  // Middleware kiểm tra trước khi xóa nhiều
  schema.pre("deleteMany", async function (next) {
    try {
      const Product = mongoose.model("Product");
      const tagIds = await this.model.find(this.getFilter()).select("_id");

      for (const tag of tagIds) {
        const count = await Product.countDocuments({
          tags: tag._id,
          deletedAt: null,
        });

        if (count > 0) {
          throw new ApiError(
            400,
            `Không thể xóa tag có ID ${tag._id} vì có ${count} sản phẩm đang sử dụng`
          );
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  });
};

module.exports = { applyMiddlewares };
