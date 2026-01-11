const applyMiddlewares = (schema) => {
  // Chuyển đổi mã màu thành chữ in hoa
  schema.pre("save", function (next) {
    if (this.code) {
      this.code = this.code.toUpperCase();
    }

    // Chuyển đổi tất cả các màu thành chữ in hoa nếu có
    if (this.colors && Array.isArray(this.colors)) {
      this.colors = this.colors.map((color) => color.toUpperCase());
    }

    next();
  });

  // Xử lý khi khôi phục (đặt deletedAt thành null)
  schema.pre("findOneAndUpdate", async function (next) {
    const update = this.getUpdate();

    // Nếu đang khôi phục (đặt deletedAt thành null)
    if (update && update.$set && update.$set.deletedAt === null) {
      try {
        const doc = await this.model.findOne(this.getFilter(), {
          includeDeleted: true,
        });

        if (doc) {
          // Kiểm tra xem có màu nào khác đang dùng tên này không
          const duplicate = await this.model.findOne({
            name: doc.name,
            _id: { $ne: doc._id },
            deletedAt: null,
          });

          if (duplicate) {
            // Nếu có, tạo một tên mới với hậu tố thời gian
            const newName = `${doc.name} (${Date.now()})`;
            update.$set.name = newName;
            console.log(
              `Tên màu bị trùng khi khôi phục, đã tạo tên mới: ${newName}`
            );
          }
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra tên màu khi khôi phục:", error);
      }
    }

    // Đảm bảo mã màu luôn là chữ in hoa khi cập nhật
    if (update && update.code) {
      update.code = update.code.toUpperCase();
    }

    if (update && update.$set && update.$set.code) {
      update.$set.code = update.$set.code.toUpperCase();
    }

    // Đảm bảo các mã màu trong mảng colors luôn là chữ in hoa khi cập nhật
    if (update && update.colors && Array.isArray(update.colors)) {
      update.colors = update.colors.map((color) => color.toUpperCase());
    }

    if (
      update &&
      update.$set &&
      update.$set.colors &&
      Array.isArray(update.$set.colors)
    ) {
      update.$set.colors = update.$set.colors.map((color) =>
        color.toUpperCase()
      );
    }

    next();
  });
};

module.exports = { applyMiddlewares };
