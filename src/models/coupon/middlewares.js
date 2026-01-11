const mongoose = require("mongoose");
const ApiError = require("@utils/ApiError");

/**
 * Áp dụng middleware cho Coupon Schema
 * @param {mongoose.Schema} schema - Schema để áp dụng middleware
 */
const applyMiddlewares = (schema) => {
  // Trước khi lưu, kiểm tra và cập nhật trạng thái dựa trên thời gian
  schema.pre("save", function (next) {
    const now = new Date();

    // Cập nhật trạng thái dựa trên thời gian (nếu không phải archived hoặc inactive được set thủ công)
    if (this.status !== "inactive" && this.status !== "archived") {
      if (now < new Date(this.startDate)) {
        this.status = "inactive"; // Chưa đến thời gian bắt đầu
      } else if (now > new Date(this.endDate)) {
        this.status = "expired"; // Đã quá thời gian kết thúc
      } else if (
        this.maxUses !== undefined &&
        this.currentUses >= this.maxUses
      ) {
        this.status = "expired"; // Đã hết lượt sử dụng
      } else {
        this.status = "active"; // Đang hoạt động
      }
    }

    // Đảm bảo các giá trị hợp lệ
    if (this.type === "percent" && this.value > 100) {
      this.value = 100;
    }

    next();
  });

  // Trước khi tìm, tự động cập nhật trạng thái expired nếu đã hết hạn
  schema.pre("find", async function () {
    const now = new Date();

    // ASYNC UPDATE: Cập nhật các mã giảm giá đã hết hạn
    try {
      await this.model.updateMany(
        {
          status: "active",
          $or: [
            { endDate: { $lt: now } },
            {
              $and: [
                { maxUses: { $ne: null, $exists: true } },
                { $expr: { $gte: ["$currentUses", "$maxUses"] } },
              ],
            },
          ],
        },
        { status: "expired" }
      );
    } catch (error) {
      console.error("[Coupon Middleware] Auto-expire error:", error);
    }
  });

  // Trước khi xóa, kiểm tra xem mã giảm giá đã được sử dụng chưa
  schema.pre(
    "deleteOne",
    { document: true, query: false },
    async function (next) {
      if (this.currentUses > 0) {
        // Nếu đã được sử dụng, thay vì xóa thì chuyển sang archived
        this.status = "archived";
        await this.save();

        // Ngăn không cho xóa thực sự
        return next(
          new ApiError(
            409,
            "Không thể xóa mã giảm giá đã được sử dụng. Đã chuyển sang trạng thái 'archived'."
          )
        );
      }

      next();
    }
  );

  // Cũng áp dụng cho deleteMany và findOneAndDelete
  schema.pre("deleteMany", async function (next) {
    const docs = await this.model.find(this.getFilter());

    for (const doc of docs) {
      if (doc.currentUses > 0) {
        // Cập nhật sang archived thay vì xóa
        await doc.updateOne({ status: "archived" });
      }
    }

    // Chỉ xóa các mã chưa được sử dụng
    this.setQuery({ ...this.getFilter(), currentUses: 0 });

    next();
  });

  schema.pre("findOneAndDelete", async function (next) {
    const doc = await this.model.findOne(this.getFilter());

    if (doc && doc.currentUses > 0) {
      // Nếu đã được sử dụng, thay vì xóa thì chuyển sang archived
      await doc.updateOne({ status: "archived" });

      // Ngăn không cho xóa thực sự
      return next(
        new ApiError(
          409,
          "Không thể xóa mã giảm giá đã được sử dụng. Đã chuyển sang trạng thái 'archived'."
        )
      );
    }

    next();
  });
};

module.exports = { applyMiddlewares };
