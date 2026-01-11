const mongoose = require("mongoose");
const ApiError = require("@utils/ApiError");

/**
 * Áp dụng middlewares cho CancelRequest schema
 * @param {Schema} schema - Mongoose Schema
 */
const applyMiddlewares = (schema) => {
  // Xử lý trước khi lưu CancelRequest
  schema.pre("save", async function (next) {
    try {
      // Khi tạo mới yêu cầu hủy
      if (this.isNew) {
        // Lấy đơn hàng
        const Order = mongoose.model("Order");
        const order = await Order.findById(this.order);

        if (!order) {
          throw new ApiError(404, "Không tìm thấy đơn hàng");
        }

        // Kiểm tra nếu đơn hàng đã được giao hoặc đã hủy
        if (order.status === "delivered") {
          throw new ApiError(400, "Không thể hủy đơn hàng đã giao");
        }

        if (order.status === "cancelled") {
          throw new ApiError(400, "Đơn hàng đã bị hủy");
        }

        // Kiểm tra xem có yêu cầu hủy nào đang chờ xử lý cho đơn hàng này không
        const CancelRequest = mongoose.model("CancelRequest");
        const existingPendingRequest = await CancelRequest.findOne({
          order: this.order,
          status: "pending"
        });

        if (existingPendingRequest) {
          throw new ApiError(400, "Đã có yêu cầu hủy cho đơn hàng này đang chờ xử lý");
        }

        // Tự động chấp nhận yêu cầu hủy nếu đơn hàng chưa được xác nhận
        if (order.status === "pending") {
          this.status = "approved";
          this.adminResponse = "Hủy tự động khi đơn hàng chưa được xác nhận";
          this.resolvedAt = new Date();

          // Cập nhật thông tin đơn hàng: trạng thái, lý do hủy
          await Order.findByIdAndUpdate(
            this.order,
            {
              status: "cancelled",
              cancelReason: this.reason,
              cancelledAt: new Date(),
              $push: {
                statusHistory: {
                  status: "cancelled",
                  updatedAt: new Date(),
                  note: `Đơn hàng bị hủy tự động. Lý do: ${this.reason}`,
                },
              },
            },
            { new: true }
          );
        }

        // Cập nhật đơn hàng có yêu cầu hủy
        await Order.findByIdAndUpdate(
          this.order,
          {
            cancelRequestId: this._id,
            hasCancelRequest: true,
          },
          { new: true }
        );
      }

      // Khi cập nhật trạng thái yêu cầu hủy
      if (this.isModified("status") && !this.isNew) {
        const Order = mongoose.model("Order");
        const order = await Order.findById(this.order);

        if (!order) {
          throw new ApiError(404, "Không tìm thấy đơn hàng");
        }

        // Nếu yêu cầu được chấp nhận
        if (this.status === "approved") {
          // Cập nhật resolvedAt nếu không có
          if (!this.resolvedAt) {
            this.resolvedAt = new Date();
          }

          // Kiểm tra trạng thái hiện tại của đơn hàng
          // Chỉ cập nhật nếu đơn hàng chưa ở trạng thái cancelled
          if (order.status !== "cancelled") {
            console.log(`[CancelRequest] Cập nhật đơn hàng #${order.code} sang trạng thái cancelled`);
            
            // Cập nhật thông tin đơn hàng: trạng thái, lý do hủy
            await Order.findByIdAndUpdate(
              this.order,
              {
                status: "cancelled",
                cancelReason: this.reason,
                cancelledAt: new Date(),
                $push: {
                  statusHistory: {
                    status: "cancelled",
                    updatedAt: new Date(),
                    note: `Đơn hàng bị hủy theo yêu cầu. Lý do: ${this.reason}`,
                  },
                },
              },
              { new: true }
            );
          } else {
            console.log(`[CancelRequest] Đơn hàng #${order.code} đã ở trạng thái cancelled, bỏ qua cập nhật`);
          }

          console.log(`Yêu cầu hủy #${this._id} được chấp nhận cho đơn hàng #${order.code}`);
        }
        // Nếu yêu cầu bị từ chối
        else if (this.status === "rejected") {
          // Cập nhật resolvedAt nếu không có
          if (!this.resolvedAt) {
            this.resolvedAt = new Date();
          }

          // Khôi phục trạng thái đơn hàng trước đó
          // Chỉ cập nhật nếu đơn hàng vẫn có yêu cầu hủy
          if (order.hasCancelRequest) {
            await Order.findByIdAndUpdate(
              this.order,
              {
                hasCancelRequest: false,
                $push: {
                  statusHistory: {
                    status: order.status,
                    updatedAt: new Date(),
                    note: "Đơn hàng được khôi phục sau khi từ chối yêu cầu hủy",
                  },
                },
              },
              { new: true }
            );
          }

          console.log(`Yêu cầu hủy #${this._id} bị từ chối cho đơn hàng #${order.code}`);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  });

  // Sau khi lưu yêu cầu hủy
  schema.post("save", async function (doc) {
    try {
      const Order = mongoose.model("Order");
      const order = await Order.findById(doc.order);

      if (!order) return;

      // Ghi log thông tin cập nhật
      if (doc.createdAt && doc.updatedAt && 
          doc.createdAt.toString() === doc.updatedAt.toString()) {
        console.log(`Đã tạo yêu cầu hủy mới #${doc._id} cho đơn hàng #${order.code}`);
      } 
      else if (doc.status === "approved" || doc.status === "rejected") {
        console.log(`Yêu cầu hủy #${doc._id} được cập nhật trạng thái: ${doc.status}`);
      }
    } catch (error) {
      console.error("Lỗi khi xử lý yêu cầu hủy đơn:", error);
    }
  });
};

module.exports = { applyMiddlewares };