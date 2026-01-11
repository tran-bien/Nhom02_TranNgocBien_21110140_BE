const mongoose = require("mongoose");

const applyMiddlewares = (schema) => {
  // Xử lý giá trị trước khi lưu
  schema.pre("save", function (next) {
    // Đảm bảo giá trị là số dương
    if (this.isModified("value")) {
      this.value = Math.abs(this.value);
    }

    next();
  });

  // Middleware trước khi cập nhật để xử lý giá trị
  schema.pre("findOneAndUpdate", function (next) {
    const update = this.getUpdate();

    // Đảm bảo giá trị là số dương nếu được cập nhật
    if (update && update.value !== undefined) {
      update.value = Math.abs(update.value);
    }

    if (update && update.$set && update.$set.value !== undefined) {
      update.$set.value = Math.abs(update.$set.value);
    }

    // Xử lý khi khôi phục (đặt deletedAt thành null)
    if (update && update.$set && update.$set.deletedAt === null) {
      try {
        const doc = this.getFilter();

        // Ghi log quá trình khôi phục
        console.log(
          `Đang thực hiện khôi phục kích thước: ${JSON.stringify(doc)}`
        );

        // Lưu ý: Không xử lý đặc biệt về trùng lặp vì value và description không được đánh dấu unique
        // Nếu có yêu cầu kiểm tra trùng lặp, sẽ xử lý ở đây
      } catch (error) {
        console.error("Lỗi khi khôi phục kích thước:", error);
      }
    }

    next();
  });
};

module.exports = { applyMiddlewares };
