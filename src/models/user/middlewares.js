const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const applyMiddlewares = (schema) => {
  // Mã hóa mật khẩu trước khi lưu
  schema.pre("save", async function (next) {
    if (this.isModified("password")) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  });

  // Đảm bảo chỉ có một địa chỉ mặc định
  schema.pre("save", function (next) {
    if (this.isModified("addresses")) {
      ensureOnlyOneDefaultAddress(this.addresses);
    }
    next();
  });

  // Middleware trước khi cập nhật để hash mật khẩu nếu được cập nhật
  schema.pre("findOneAndUpdate", async function (next) {
    try {
      const update = this.getUpdate();

      // 1. Xử lý password nếu được cập nhật
      if (update && update.password) {
        const salt = await bcrypt.genSalt(10);
        update.password = await bcrypt.hash(update.password, salt);
      }

      // 2. Xử lý khi cập nhật địa chỉ
      if (update && update.$set && update.$set.addresses) {
        ensureOnlyOneDefaultAddress(update.$set.addresses);
      }

      // 3. Xử lý khi thêm địa chỉ mới
      if (update && update.$push && update.$push.addresses) {
        // Lấy dữ liệu hiện tại để kiểm tra
        const doc = await this.model.findOne(this.getQuery());
        if (doc) {
          // Nếu thêm địa chỉ đầu tiên, đặt làm mặc định
          if (!doc.addresses || doc.addresses.length === 0) {
            if (update.$push.addresses.isDefault === undefined) {
              update.$push.addresses.isDefault = true;
            }
          }
          // Nếu địa chỉ mới đặt làm mặc định, cập nhật các địa chỉ khác
          else if (update.$push.addresses.isDefault) {
            await this.model.updateOne(
              { _id: doc._id },
              { $set: { "addresses.$[elem].isDefault": false } },
              { arrayFilters: [{ "elem.isDefault": true }] }
            );
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  });

  // Middleware để đảm bảo trạng thái block/active đúng
  schema.pre("save", function (next) {
    // Nếu user bị block
    if (this.isModified("blockedAt") && this.blockedAt) {
      this.isActive = false;
    }

    // Nếu user được unblock
    if (this.isModified("blockedAt") && this.blockedAt === null) {
      this.isActive = true;
      this.blockReason = null;
    }

    next();
  });
};

/**
 * Đảm bảo chỉ có một địa chỉ mặc định trong mảng
 * @param {Array} addresses Mảng các địa chỉ
 */
function ensureOnlyOneDefaultAddress(addresses) {
  if (!addresses || !Array.isArray(addresses)) return;

  let hasDefault = false;

  // Kiểm tra và đảm bảo chỉ có một địa chỉ mặc định
  addresses.forEach((address) => {
    if (address.isDefault) {
      if (hasDefault) {
        address.isDefault = false;
      } else {
        hasDefault = true;
      }
    }
  });

  // Nếu không có địa chỉ mặc định và có ít nhất một địa chỉ
  if (!hasDefault && addresses.length > 0) {
    addresses[0].isDefault = true;
  }
}

module.exports = { applyMiddlewares };
