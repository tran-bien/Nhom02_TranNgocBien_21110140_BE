/**
 * Áp dụng middleware cho Banner Schema
 * @param {mongoose.Schema} schema - Schema để áp dụng middleware
 */
const applyMiddlewares = (schema) => {
  // Middleware để validate displayOrder trước khi save
  schema.pre("save", async function (next) {
    if (this.isModified("displayOrder") && this.isActive && !this.deletedAt) {
      // Kiểm tra xem có banner nào khác đang sử dụng displayOrder này không
      const existingBanner = await this.constructor.findOne({
        displayOrder: this.displayOrder,
        isActive: true,
        deletedAt: null,
        _id: { $ne: this._id },
      });

      if (existingBanner) {
        const error = new Error(
          `Vị trí ${this.displayOrder} đã được sử dụng bởi banner khác`
        );
        error.name = "ValidationError";
        return next(error);
      }
    }
    next();
  });

  // Middleware để tự động điều chỉnh displayOrder khi xóa banner
  schema.pre("findOneAndUpdate", async function (next) {
    const update = this.getUpdate();

    // Nếu đang xóa mềm banner (set deletedAt)
    if (update.deletedAt && update.deletedAt !== null) {
      const banner = await this.model.findOne(this.getQuery());
      if (banner && banner.isActive) {
        // Điều chỉnh displayOrder của các banner có order lớn hơn
        await this.model.updateMany(
          {
            displayOrder: { $gt: banner.displayOrder },
            isActive: true,
            deletedAt: null,
          },
          { $inc: { displayOrder: -1 } }
        );
      }
    }

    next();
  });
};

module.exports = { applyMiddlewares };
