const { createSlug } = require("@utils/slugify");
const mongoose = require("mongoose");

/**
 * Áp dụng middleware cho Brand Schema
 * @param {mongoose.Schema} schema - Schema để áp dụng middleware
 */
const applyMiddlewares = (schema) => {
  // Tạo slug trước khi lưu - đồng bộ với logic trong service
  schema.pre("save", function (next) {
    // Nếu name thay đổi và slug chưa được đặt bởi service
    if (this.isModified("name") && !this.isModified("slug")) {
      this.slug = createSlug(this.name);
    }
    next();
  });

  // Tạo ra slug mới khi khôi phục nếu đã có thương hiệu khác với cùng tên
  schema.pre("findOneAndUpdate", async function (next) {
    const update = this.getUpdate();

    // Nếu đang khôi phục (đặt deletedAt thành null)
    if (update && update.$set && update.$set.deletedAt === null) {
      try {
        const doc = await this.model.findOne(this.getFilter(), {
          includeDeleted: true,
        });
        if (doc) {
          // Kiểm tra xem có thương hiệu nào khác đang dùng slug này không
          const duplicate = await this.model.findOne({
            slug: doc.slug,
            _id: { $ne: doc._id },
            deletedAt: null,
          });

          if (duplicate) {
            // Nếu có, tạo một slug mới với hậu tố thời gian
            const newSlug = `${doc.slug}-${Date.now()}`;
            update.$set.slug = newSlug;
            console.log(
              `Đã tạo slug mới khi khôi phục thương hiệu: ${newSlug}`
            );
          }
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra slug khi khôi phục:", error);
      }
    }

    next();
  });
};

module.exports = { applyMiddlewares };
