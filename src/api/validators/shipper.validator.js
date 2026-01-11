const { body, param, query } = require("express-validator");
const mongoose = require("mongoose");

/**
 * Validator cho gán đơn hàng
 */
exports.validateAssignOrder = [
  param("orderId")
    .notEmpty()
    .withMessage("Order ID không được để trống")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Order ID không hợp lệ");
      }
      return true;
    }),

  body("shipperId")
    .notEmpty()
    .withMessage("Shipper ID không được để trống")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Shipper ID không hợp lệ");
      }
      return true;
    }),
];

/**
 * Validator cho cập nhật trạng thái giao hàng
 */
exports.validateUpdateDeliveryStatus = [
  param("orderId")
    .notEmpty()
    .withMessage("Order ID không được để trống")
    .isMongoId()
    .withMessage("Order ID không hợp lệ"),

  body("status")
    .notEmpty()
    .withMessage("Trạng thái không được để trống")
    .isIn(["out_for_delivery", "delivery_failed", "delivered"])
    .withMessage(
      "Trạng thái phải là: out_for_delivery, delivery_failed, hoặc delivered"
    ),

  body("note").optional().isString(),

  body("images").optional().isArray().withMessage("Images phải là array"),

  body("images.*")
    .optional()
    .isString()
    .withMessage("Mỗi image phải là string"),
];

/**
 * Validator cho cập nhật trạng thái sẵn sàng
 */
exports.validateUpdateAvailability = [
  body("isAvailable")
    .notEmpty()
    .withMessage("Trạng thái sẵn sàng không được để trống")
    .isBoolean()
    .withMessage("Trạng thái sẵn sàng phải là boolean"),
];

/**
 * Validator cho lấy danh sách shipper
 */
exports.validateGetShippers = [
  query("available")
    .optional()
    .isIn(["true", "false"])
    .withMessage("available phải là true hoặc false"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Số trang phải là số nguyên dương"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Số lượng mỗi trang phải từ 1-100"),

  query("sortBy")
    .optional()
    .isIn(["createdAt", "name", "email"])
    .withMessage("sortBy phải là: createdAt, name, hoặc email"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder phải là: asc hoặc desc"),
];

/**
 * Validator cho lấy đơn hàng của shipper
 */
exports.validateGetShipperOrders = [
  query("status")
    .optional()
    .isIn([
      "assigned_to_shipper",
      "out_for_delivery",
      "delivery_failed",
      "delivered",
      "returning_to_warehouse",
    ])
    .withMessage("Trạng thái không hợp lệ"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Số trang phải là số nguyên dương"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Số lượng mỗi trang phải từ 1-100"),

  query("sortBy")
    .optional()
    .isIn(["createdAt", "assignmentTime", "deliveredAt"])
    .withMessage("sortBy phải là: createdAt, assignmentTime, hoặc deliveredAt"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder phải là: asc hoặc desc"),
];

/**
 * Validator cho shipper ID
 */
exports.validateShipperId = [
  param("shipperId")
    .notEmpty()
    .withMessage("Shipper ID không được để trống")
    .isMongoId()
    .withMessage("Shipper ID không hợp lệ"),
];
