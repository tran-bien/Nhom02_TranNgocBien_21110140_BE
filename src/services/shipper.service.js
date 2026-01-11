const { User, Order } = require("../models");
const ApiError = require("../utils/ApiError");

/**
 * Lấy danh sách shippers
 */
const getShippers = async (query = {}) => {
  const {
    available,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const filter = { role: "shipper" };

  // Filter theo availability
  if (available === "true") {
    filter["shipper.isAvailable"] = true;
  } else if (available === "false") {
    filter["shipper.isAvailable"] = false;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

  const [shippers, total] = await Promise.all([
    User.find(filter)
      .select("name email phone shipper avatar createdAt")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(filter),
  ]);

  return {
    shippers,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

/**
 * Cập nhật trạng thái shipper
 */
const updateShipperAvailability = async (shipperId, isAvailable) => {
  const shipper = await User.findOne({ _id: shipperId, role: "shipper" });

  if (!shipper) {
    throw new ApiError(404, "Không tìm thấy shipper");
  }

  shipper.shipper.isAvailable = isAvailable;
  await shipper.save();

  return shipper;
};

/**
 * Gán đơn hàng cho shipper
 */
const assignOrderToShipper = async (orderId, shipperId, assignedBy) => {
  // FIX: Query order riêng, không dùng Promise.all với 1 element
  const order = await Order.findById(orderId).populate([
    {
      path: "orderItems.variant",
      select: "product color",
      populate: { path: "product", select: "_id name" },
    },
    { path: "orderItems.size", select: "_id value" },
  ]);

  if (!order) {
    throw new ApiError(404, "Không tìm thấy đơn hàng");
  }

  // Kiểm tra order đã có shipper chưa
  if (order.assignedShipper) {
    throw new ApiError(400, "Đơn hàng đã được gán cho shipper khác");
  }

  // Kiểm tra trạng thái order phải là 'confirmed'
  if (order.status !== "confirmed") {
    throw new ApiError(
      400,
      `Chỉ có thể gán shipper cho đơn hàng đã xác nhận. Trạng thái hiện tại: ${order.status}`
    );
  }

  // ATOMIC UPDATE: Kiểm tra + tăng activeOrders trong 1 query
  // Fix race condition khi nhiều admin gán đơn cùng lúc
  const updatedShipper = await User.findOneAndUpdate(
    {
      _id: shipperId,
      role: "shipper",
      "shipper.isAvailable": true,
      // ATOMIC CHECK: activeOrders < maxOrders
      $expr: { $lt: ["$shipper.activeOrders", "$shipper.maxOrders"] },
    },
    {
      $inc: { "shipper.activeOrders": 1 },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  // Nếu không tìm thấy = shipper không khả dụng hoặc đã đầy đơn
  if (!updatedShipper) {
    throw new ApiError(
      400,
      "Shipper không khả dụng hoặc đã đạt số đơn tối đa. Vui lòng chọn shipper khác."
    );
  }

  // TỰ ĐỘNG XUẤT KHO KHI GÁN CHO SHIPPER
  // Sử dụng dedicated function từ inventory.service
  if (!order.inventoryDeducted) {
    const inventoryService = require("@services/inventory.service");

    try {
      // GỌI DEDICATED FUNCTION - All logic nằm trong inventory.service
      await inventoryService.deductInventoryForOrder(order, assignedBy);
      order.inventoryDeducted = true;
    } catch (error) {
      // Rollback shipper activeOrders nếu trừ kho thất bại
      await User.findByIdAndUpdate(shipperId, {
        $inc: { "shipper.activeOrders": -1 },
      });

      throw error; // Re-throw để client nhận error
    }
  }

  // Kiểm tra shipper availability - FIXED: Không cần check vì atomic query đã check
  // if (!updatedShipper.shipper.isAvailable) { ... }

  // Cập nhật đơn hàng
  order.assignedShipper = shipperId;
  order.assignmentTime = new Date();
  // NOTE: Gán shipper = assigned_to_shipper, shipper sẽ confirm "Bắt đầu giao" để chuyển sang out_for_delivery
  order.status = "assigned_to_shipper";
  order.statusHistory.push({
    status: "assigned_to_shipper",
    updatedAt: new Date(),
    updatedBy: assignedBy,
    note: `Đơn hàng được gán cho shipper ${updatedShipper.name}`,
  });

  await order.save();

  // FIX: XÓA DUPLICATE - activeOrders đã được tăng trong atomic update ở trên
  // shipper.shipper.activeOrders += 1; // REMOVED - DUPLICATE
  // await shipper.save(); // REMOVED - DUPLICATE

  return order;
};

/**
 * Shipper cập nhật trạng thái giao hàng
 */
const updateDeliveryStatus = async (orderId, shipperId, data) => {
  const { status, location, note, images } = data;

  const order = await Order.findOne({
    _id: orderId,
    assignedShipper: shipperId,
  });

  if (!order) {
    throw new ApiError(404, "Không tìm thấy đơn hàng hoặc không có quyền");
  }

  // Validate status transitions
  const validStatuses = ["out_for_delivery", "delivered", "delivery_failed"];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, "Trạng thái không hợp lệ");
  }

  // FIXED Bug #27: Validate allowed status transitions từ current status
  const allowedTransitions = {
    assigned_to_shipper: ["out_for_delivery"], // Shipper confirm bắt đầu giao
    out_for_delivery: ["delivered", "delivery_failed"],
    delivery_failed: ["out_for_delivery", "delivery_failed"], // Có thể thử giao lại hoặc fail tiếp
  };

  const currentAllowed = allowedTransitions[order.status];
  if (!currentAllowed || !currentAllowed.includes(status)) {
    throw new ApiError(
      400,
      `Không thể chuyển từ trạng thái "${order.status}" sang "${status}"`
    );
  }

  // Thêm vào lịch sử giao hàng
  order.deliveryAttempts.push({
    time: new Date(),
    status:
      status === "delivered"
        ? "success"
        : status === "delivery_failed"
        ? "failed"
        : status,
    location,
    note,
    shipper: shipperId,
    images: images || [],
  });

  // Cập nhật trạng thái đơn hàng
  if (status === "delivered") {
    // FIX Bug #3: Kiểm tra inventoryDeducted trước khi cho phép delivered
    if (!order.inventoryDeducted) {
      console.error(
        `[Shipper] CRITICAL: Order ${order.code} chưa được trừ kho nhưng đang cố gắng mark delivered`
      );
      throw new ApiError(
        400,
        "Đơn hàng chưa được xử lý xuất kho. Vui lòng liên hệ admin."
      );
    }

    order.status = "delivered";
    order.deliveredAt = new Date();
    order.payment.paymentStatus = "paid";
    order.payment.paidAt = new Date();

    // REMOVED: Duplicate loyalty points - ĐÃ XỬ LÝ BỞI order/middlewares.js post('save')
    // Order middleware kiểm tra loyaltyPointsAwarded flag để tránh tích điểm 2 lần
    // Nên chỉ cần 1 nơi xử lý loyalty points

    // REMOVED: Duplicate notification - ĐÃ XỬ LÝ BỞI order/middlewares.js post('save')
    // Order middleware sẽ gửi notification khi status chuyển sang delivered

    // Cập nhật user behavior
    try {
      const userBehaviorService = require("./userBehavior.service");
      await userBehaviorService.updateFromOrder(order.user, order);
    } catch (error) {
      console.error("[Shipper] Lỗi update user behavior:", error.message);
    }

    // Giảm số đơn active của shipper
    const shipper = await User.findById(shipperId);
    if (shipper && shipper.shipper) {
      shipper.shipper.activeOrders = Math.max(
        0,
        shipper.shipper.activeOrders - 1
      );
      shipper.shipper.deliveryStats.total += 1;
      shipper.shipper.deliveryStats.successful += 1;
      await shipper.save();
    }
  } else if (status === "delivery_failed") {
    order.status = "delivery_failed";

    // Nếu thất bại 3 lần thì chuyển trạng thái về returning_to_warehouse
    const failedAttempts = order.deliveryAttempts.filter(
      (a) => a.status === "failed" || a.status === "delivery_failed"
    ).length;

    if (failedAttempts >= 3) {
      // Set status = returning_to_warehouse thay vì cancelled ngay
      order.status = "returning_to_warehouse";
      order.cancelReason =
        "Giao hàng thất bại sau 3 lần thử - Hàng đang trả về kho";

      // Set returnConfirmed = false (chờ staff xác nhận nhận hàng)
      order.returnConfirmed = false;

      // KHÔNG thay đổi inventoryDeducted (vẫn = true)
      // Chờ staff xác nhận rồi mới hoàn kho

      console.log(
        `[Shipper Service] Order ${order.code}: Giao thất bại 3 lần, hàng đang trả về kho`
      );

      // Giảm số đơn active của shipper
      const shipper = await User.findById(shipperId);
      if (shipper && shipper.shipper) {
        shipper.shipper.activeOrders = Math.max(
          0,
          shipper.shipper.activeOrders - 1
        );
        shipper.shipper.deliveryStats.total += 1;
        shipper.shipper.deliveryStats.failed += 1;
        await shipper.save();
      }
    }
  } else if (status === "out_for_delivery") {
    order.status = "out_for_delivery";
  }

  // Thêm vào status history
  order.statusHistory.push({
    status: order.status,
    updatedAt: new Date(),
    updatedBy: shipperId,
    note: note || `Shipper cập nhật trạng thái`,
  });

  await order.save();

  return order;
};

/**
 * Lấy đơn hàng của shipper
 */
const getShipperOrders = async (shipperId, query = {}) => {
  const {
    status,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const filter = { assignedShipper: shipperId };

  // Filter theo status
  if (status) {
    filter.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("user", "name phone email")
      .populate({
        path: "orderItems.variant",
        select: "sku color images",
        populate: [
          {
            path: "product",
            select: "name slug images",
          },
          {
            path: "color",
            select: "name hexCode",
          },
        ],
      })
      .populate("orderItems.size", "value")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    Order.countDocuments(filter),
  ]);

  return {
    orders,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

/**
 * Thống kê shipper
 */
const getShipperStats = async (shipperId) => {
  const shipper = await User.findOne({ _id: shipperId, role: "shipper" });

  if (!shipper) {
    throw new ApiError(404, "Không tìm thấy shipper");
  }

  // Query activeOrders from database for real-time accuracy
  const activeOrders = await Order.countDocuments({
    assignedShipper: shipperId,
    status: { $in: ["assigned_to_shipper", "out_for_delivery"] },
  });

  // Use deliveryStats from User document (updated by updateDeliveryStatus)
  // This is more accurate than querying orders because:
  // - Failed orders may have transitioned to "returning_to_warehouse" status
  // - The stats are incremented at the time of delivery/failure
  const totalOrders = shipper.shipper.deliveryStats.total || 0;
  const completedOrders = shipper.shipper.deliveryStats.successful || 0;
  const failedOrders = shipper.shipper.deliveryStats.failed || 0;

  return {
    shipper: {
      name: shipper.name,
      email: shipper.email,
      phone: shipper.phone,
      isAvailable: shipper.shipper.isAvailable,
      maxOrders: shipper.shipper.maxOrders,
    },
    stats: {
      totalOrders,
      completedOrders,
      failedOrders,
      activeOrders,
      successRate:
        totalOrders > 0
          ? ((completedOrders / totalOrders) * 100).toFixed(2)
          : 0,
    },
  };
};

/**
 * Lấy thông tin chi tiết shipper
 */
const getShipperById = async (shipperId) => {
  const shipper = await User.findOne({
    _id: shipperId,
    role: "shipper",
  }).select("name email phone shipper avatar createdAt");

  if (!shipper) {
    throw new ApiError(404, "Không tìm thấy shipper");
  }

  return shipper;
};

module.exports = {
  getShippers,
  updateShipperAvailability,
  assignOrderToShipper,
  updateDeliveryStatus,
  getShipperOrders,
  getShipperStats,
  getShipperById,
};
