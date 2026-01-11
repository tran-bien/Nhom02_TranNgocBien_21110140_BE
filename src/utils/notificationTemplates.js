/**
 * Template cho các loại notification
 * Sử dụng {{variable}} để thay thế động
 */
const templates = {
  ORDER_CONFIRMED: {
    title: "Đơn hàng {{orderCode}} đã được xác nhận",
    message:
      "Đơn hàng của bạn đang được chuẩn bị. Cảm ơn bạn đã mua hàng tại Shop!",
    actionText: "Xem đơn hàng",
    actionUrl: "/user-order/{{orderId}}",
  },

  ORDER_SHIPPING: {
    title: "Đơn hàng {{orderCode}} đang được giao",
    message:
      "Shipper đang trên đường giao hàng đến bạn. Vui lòng chú ý điện thoại!",
    actionText: "Theo dõi đơn hàng",
    actionUrl: "/user-order/{{orderId}}",
  },

  ORDER_DELIVERED: {
    title: "Đơn hàng {{orderCode}} đã giao thành công",
    message:
      "Cảm ơn bạn đã mua hàng! Đừng quên đánh giá sản phẩm để nhận thêm điểm.",
    actionText: "Đánh giá ngay",
    actionUrl: "/user-order/{{orderId}}",
  },

  ORDER_CANCELLED: {
    title: "Đơn hàng {{orderCode}} đã bị hủy",
    message: "Đơn hàng của bạn đã bị hủy. Lý do: {{reason}}",
    actionText: "Xem chi tiết",
    actionUrl: "/user-order/{{orderId}}",
  },

  RETURN_APPROVED: {
    title: "Yêu cầu {{type}} đã được chấp nhận",
    message:
      "Yêu cầu {{type}} cho đơn {{orderCode}} đã được duyệt. Vui lòng làm theo hướng dẫn.",
    actionText: "Xem chi tiết",
    actionUrl: "/user-manage-order",
  },

  RETURN_REQUEST_APPROVED: {
    title: "Yêu cầu {{type}} đã được chấp nhận",
    message:
      "Yêu cầu trả hàng/hoàn tiền #{{returnRequestCode}} đã được chấp nhận. Vui lòng làm theo hướng dẫn.",
    actionText: "Xem chi tiết",
    actionUrl: "/user-manage-order",
  },

  RETURN_REQUEST_PROCESSING: {
    title: "Đang xử lý yêu cầu {{type}}",
    message:
      "Chúng tôi đang xử lý yêu cầu #{{returnRequestCode}}. Vui lòng đợi thêm thông tin.",
    actionText: "Xem chi tiết",
    actionUrl: "/user-manage-order",
  },

  RETURN_REQUEST_COMPLETED: {
    title: "Hoàn tất {{type}}",
    message: "Yêu cầu #{{returnRequestCode}} đã được xử lý thành công.",
    actionText: "Xem chi tiết",
    actionUrl: "/user-manage-order",
  },

  RETURN_REQUEST_REJECTED: {
    title: "Yêu cầu {{type}} bị từ chối",
    message: "Rất tiếc, yêu cầu #{{returnRequestCode}} không được chấp nhận.",
    actionText: "Xem chi tiết",
    actionUrl: "/user-manage-order",
  },

  RETURN_REQUEST_CANCELED: {
    title: "Yêu cầu {{type}} đã bị hủy",
    message: "Yêu cầu #{{returnRequestCode}} đã bị hủy.",
    actionText: "Xem chi tiết",
    actionUrl: "/user-manage-order",
  },

  RETURN_REJECTED: {
    title: "Yêu cầu trả hàng/hoàn tiền bị từ chối",
    message:
      "Yêu cầu trả hàng/hoàn tiền cho đơn {{orderCode}} bị từ chối. Lý do: {{reason}}",
    actionText: "Xem chi tiết",
    actionUrl: "/user-manage-order",
  },

  RETURN_COMPLETED: {
    title: "Trả hàng/hoàn tiền hoàn tất",
    message:
      "Yêu cầu trả hàng/hoàn tiền cho đơn {{orderCode}} đã được xử lý xong.",
    actionText: "Xem chi tiết",
    actionUrl: "/user-manage-order",
  },

  LOYALTY_TIER_UP: {
    title: "Chúc mừng! Bạn đã lên hạng {{tierName}}",
    message: "Bạn nhận được ưu đãi: giảm giá và tích điểm x{{multiplier}}",
    actionText: "Xem ưu đãi",
    actionUrl: "/loyalty/dashboard",
  },
};

/**
 * Render template với data động
 * @param {String} type - Loại notification
 * @param {Object} data - Data để thay thế vào template
 * @returns {Object} - Template đã render
 */
const renderTemplate = (type, data) => {
  const template = templates[type];

  if (!template) {
    return {
      title: "Thông báo",
      message: "Bạn có thông báo mới",
      actionText: "Xem chi tiết",
      actionUrl: "/",
    };
  }

  const rendered = {};

  for (const key in template) {
    let value = template[key];

    // Thay thế {{variable}} bằng giá trị thực
    value = value.replace(/\{\{(\w+)\}\}/g, (match, prop) => {
      return data[prop] !== undefined ? data[prop] : match;
    });

    rendered[key] = value;
  }

  return rendered;
};

/**
 * Generate idempotency key
 */
const generateIdempotencyKey = (type, userId, referenceId) => {
  return `${type}_${userId}_${referenceId || Date.now()}`;
};

module.exports = {
  templates,
  renderTemplate,
  generateIdempotencyKey,
};
