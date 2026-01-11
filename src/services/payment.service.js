const crypto = require("crypto");
const moment = require("moment");
const querystring = require("querystring");
const { Order } = require("@models");
const ApiError = require("@utils/ApiError");
const mongoose = require("mongoose");

/**
 * Sắp xếp đối tượng theo key
 * @param {Object} obj - Đối tượng cần sắp xếp
 * @returns {Object} - Đối tượng đã sắp xếp
 */
const sortObject = (obj) => {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  keys.forEach((key) => {
    sorted[key] = obj[key];
  });
  return sorted;
};

const paymentService = {
  createVnpayPaymentUrl: async (paymentData) => {
    try {
      const { orderId, amount, returnUrl, ipAddr } = paymentData;

      // Kiểm tra đơn hàng trước
      const order = await Order.findById(orderId);
      if (!order) {
        throw new ApiError(404, "Không tìm thấy đơn hàng");
      }
      if (order.payment.paymentStatus === "paid") {
        throw new ApiError(400, "Đơn hàng này đã được thanh toán");
      }

      // Cấu hình VNPAY - FIX: Lấy từ env thay vì hardcode
      const vnp_TmnCode = process.env.VNP_TMN_CODE;
      const vnp_HashSecret = process.env.VNP_HASH_SECRET;
      // FIX: VNP_URL đã được cấu hình trong env (sandbox/production)
      const vnp_Url =
        process.env.VNP_URL ||
        "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
      const vnp_ReturnUrl = returnUrl || process.env.VNP_RETURN_URL;

      // Tạo ngày tháng theo định dạng
      const date = new Date();
      const createDate = moment(date).format("YYYYMMDDHHmmss"); // Sử dụng moment.js

      // FIX: Tạo mã giao dịch đơn giản như code cũ hoạt động được
      // VNPAY yêu cầu vnp_TxnRef ngắn gọn
      const randomAttempt = Math.floor(100000 + Math.random() * 900000);
      const vnp_TxnRef = `T${randomAttempt}`; // Đơn giản hóa mã giao dịch giống code cũ

      // FIX: VNPAY chỉ chấp nhận IPv4, convert IPv6 localhost sang IPv4
      let clientIp = ipAddr || "127.0.0.1";
      // Convert IPv6 localhost "::1" hoặc "::ffff:127.0.0.1" sang IPv4
      if (clientIp === "::1" || clientIp === "::ffff:127.0.0.1") {
        clientIp = "127.0.0.1";
      } else if (clientIp.startsWith("::ffff:")) {
        // Strip IPv6 prefix từ IPv4-mapped address
        clientIp = clientIp.replace("::ffff:", "");
      }

      // Chuẩn bị tham số - GIỐNG CODE CŨ HOẠT ĐỘNG ĐƯỢC
      const vnp_Params = {
        vnp_Version: "2.0.0",
        vnp_Command: "pay",
        vnp_TmnCode: vnp_TmnCode,
        vnp_Locale: "vn",
        vnp_CurrCode: "VND",
        vnp_TxnRef: vnp_TxnRef,
        vnp_OrderInfo: "Thanh toan don hang test",
        vnp_OrderType: "other",
        vnp_Amount: amount * 100,
        vnp_ReturnUrl: vnp_ReturnUrl,
        vnp_IpAddr: clientIp,
        vnp_CreateDate: createDate,
      };

      // Log để debug
      console.log(
        "VNPAY Params before signing:",
        JSON.stringify(vnp_Params, null, 2)
      );

      // Sắp xếp các tham số theo thứ tự ABC
      const sortedParams = {};
      Object.keys(vnp_Params)
        .sort()
        .forEach((key) => {
          sortedParams[key] = vnp_Params[key];
        });

      // Tạo chuỗi ký - QUAN TRỌNG: không encode URL ở đây
      let signData = "";
      Object.keys(sortedParams).forEach((key, index) => {
        if (index > 0) signData += "&";
        signData += `${key}=${sortedParams[key]}`;
      });

      console.log("Sign data:", signData);

      // Tạo chữ ký
      const hmac = crypto.createHmac("sha512", vnp_HashSecret);
      const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

      console.log("Signed hash:", signed);

      // Tạo URL đầy đủ thủ công
      let finalUrl = vnp_Url + "?";
      let idx = 0;

      Object.keys(sortedParams).forEach((key) => {
        if (idx > 0) finalUrl += "&";
        finalUrl += `${key}=${encodeURIComponent(sortedParams[key])}`;
        idx++;
      });

      // Thêm chữ ký vào URL
      finalUrl += `&vnp_SecureHash=${signed}`;

      console.log("VNPAY URL created manually:", finalUrl);

      // Lưu mã giao dịch vào đơn hàng
      try {
        order.tempPaymentRef = vnp_TxnRef;
        await order.save();
        console.log(
          `Đã liên kết mã giao dịch ${vnp_TxnRef} với đơn hàng ${order.code}`
        );
      } catch (err) {
        console.error("Không thể cập nhật đơn hàng:", err);
      }

      return finalUrl;
    } catch (error) {
      console.error("Lỗi khi tạo URL thanh toán:", error);
      throw error;
    }
  },

  verifyVnpayReturn: (vnpayParams) => {
    try {
      // Lấy các tham số cấu hình
      const vnp_HashSecret = process.env.VNP_HASH_SECRET;
      const secureHash = vnpayParams.vnp_SecureHash;

      // Log để debug
      console.log("VNPAY Return Params:", JSON.stringify(vnpayParams));
      console.log("Secret key configured:", !!vnp_HashSecret);

      // Tạo bản sao tham số để không ảnh hưởng tham số gốc
      const paramsForHash = { ...vnpayParams };
      delete paramsForHash.vnp_SecureHash;
      delete paramsForHash.vnp_SecureHashType;

      // Sắp xếp các tham số theo thứ tự chữ cái
      const sortedParams = sortObject(paramsForHash);

      // Tạo chuỗi cần ký THEO ĐỊNH DẠNG CỦA VNPAY
      // Thay vì dùng querystring.stringify, tự tạo chuỗi đúng định dạng
      let signData = "";
      Object.keys(sortedParams).forEach((key, index) => {
        if (index > 0) signData += "&";
        signData += `${key}=${sortedParams[key]}`;
      });

      console.log("Signature data:", signData);

      // Tạo chữ ký để so sánh
      const hmac = crypto.createHmac("sha512", vnp_HashSecret);
      const calculated = hmac
        .update(Buffer.from(signData, "utf-8"))
        .digest("hex");

      console.log("Calculated signature:", calculated);
      console.log("Received signature:", secureHash);

      // So sánh chữ ký
      const signatureValid = secureHash === calculated;

      if (signatureValid) {
        // Kiểm tra trạng thái thanh toán
        const responseCode = vnpayParams.vnp_ResponseCode;
        return {
          success: responseCode === "00",
          message:
            responseCode === "00"
              ? "Thanh toán thành công"
              : "Thanh toán thất bại",
          data: vnpayParams,
        };
      } else {
        console.log("CHỮ KÝ KHÔNG KHỚP!");

        // CHỈ DÙNG CHO DEVELOPMENT - BỎ KHI LÊN PRODUCTION
        // Bypass signature check nếu responseCode === "00" trong dev mode
        if (
          process.env.NODE_ENV !== "production" &&
          vnpayParams.vnp_ResponseCode === "00"
        ) {
          console.log("DEV MODE: Bypass signature check vì payment thành công");
          return {
            success: true,
            message: "Thanh toán thành công (DEV MODE - bypass signature)",
            data: vnpayParams,
          };
        }

        return {
          success: false,
          message: "Chữ ký không hợp lệ",
          data: vnpayParams,
        };
      }
    } catch (error) {
      console.error("Lỗi xử lý callback VNPAY:", error);
      return {
        success: false,
        message: error.message || "Lỗi xử lý dữ liệu thanh toán",
        data: vnpayParams,
      };
    }
  },

  /**
   * Xử lý kết quả thanh toán và cập nhật đơn hàng
   * @param {Object} vnpayParams - Các tham số trả về từ VNPAY
   * @returns {Object} - Kết quả xử lý
   */
  processPaymentResult: async (vnpayParams) => {
    try {
      console.log(
        "Đang xử lý kết quả thanh toán VNPAY:",
        JSON.stringify(vnpayParams)
      );

      // Tối ưu: Kiểm tra nhanh responseCode trước
      const responseCode = vnpayParams.vnp_ResponseCode;
      const txnRef = vnpayParams.vnp_TxnRef;
      const transactionId =
        vnpayParams.vnp_TransactionNo || vnpayParams.vnp_TxnRef;

      if (!txnRef || !responseCode) {
        return {
          success: false,
          message: "Thiếu thông tin giao dịch",
          data: vnpayParams,
        };
      }

      // Kiểm tra và xác minh tính hợp lệ của callback (chỉ kiểm tra nếu cần thiết)
      const verifyResult = paymentService.verifyVnpayReturn(vnpayParams);
      console.log("Kết quả xác minh:", JSON.stringify(verifyResult));

      // Tìm đơn hàng song song với việc xác minh
      const orderPromise = (async () => {
        // Tìm đơn hàng dựa trên mã giao dịch tạm thời
        let order = await Order.findOne({ tempPaymentRef: txnRef });

        // Nếu không tìm thấy, thử tìm đơn hàng mới nhất chưa thanh toán
        if (!order) {
          const pendingOrders = await Order.find({
            "payment.paymentStatus": "pending",
            "payment.method": "VNPAY",
          })
            .sort({ createdAt: -1 })
            .limit(1);

          if (pendingOrders.length > 0) {
            order = pendingOrders[0];
            console.log("Đơn hàng tìm thấy:", order.code);
          }
        }

        return order;
      })();

      const order = await orderPromise;
      console.log("Đơn hàng tìm thấy:", order ? order.code : "Không");

      if (!order) {
        return {
          success: false,
          message: "Không tìm thấy đơn hàng",
          data: vnpayParams,
        };
      }

      // =============================================
      // IDEMPOTENCY CHECK - Kiểm tra đã xử lý callback chưa
      // =============================================
      const vnpayTransactionNo = vnpayParams.vnp_TransactionNo;

      // Kiểm tra nếu đã thanh toán rồi thì return luôn
      if (order.payment.paymentStatus === "paid") {
        console.log(
          `[IDEMPOTENCY] Đơn hàng ${order.code} đã được thanh toán trước đó`
        );
        return {
          success: true,
          message: "Đơn hàng đã được thanh toán trước đó",
          data: {
            orderId: order._id,
            orderCode: order.code,
            amount: order.totalAfterDiscountAndShipping,
            paymentStatus: order.payment.paymentStatus,
          },
        };
      }

      // Kiểm tra nếu callback đã được xử lý với cùng vnp_TransactionNo
      if (order.payment.vnpayTransactionNo === vnpayTransactionNo) {
        console.log(
          `[IDEMPOTENCY] Callback đã được xử lý trước đó cho transaction ${vnpayTransactionNo}`
        );
        return {
          success: order.payment.paymentStatus === "paid",
          message: "Callback đã được xử lý trước đó",
          data: {
            orderId: order._id,
            orderCode: order.code,
            amount: order.totalAfterDiscountAndShipping,
            paymentStatus: order.payment.paymentStatus,
          },
        };
      }

      // Kiểm tra xác thực - nếu thất bại trong production
      if (!verifyResult.success && process.env.NODE_ENV === "production") {
        return {
          success: false,
          message: "Xác thực chữ ký thất bại",
          data: vnpayParams,
        };
      }

      // ATOMIC UPDATE - Chỉ xử lý nếu chưa processed (tránh race condition)
      // Kết hợp check + update trong 1 operation để đảm bảo idempotency
      const now = new Date();
      const updateDoc = {
        $set: {
          "payment.transactionId": transactionId,
          "payment.vnpayTransactionNo": vnpayTransactionNo,
          "payment.vnpayCallbackProcessed": true,
          "payment.vnpayCallbackProcessedAt": now,
        },
        $push: {
          paymentHistory: {
            status: responseCode === "00" ? "paid" : "failed",
            transactionId: transactionId,
            amount: order.totalAfterDiscountAndShipping,
            method: order.payment.method,
            updatedAt: now,
            responseData: vnpayParams,
          },
        },
      };

      if (responseCode === "00") {
        // Thanh toán thành công
        updateDoc.$set["payment.paymentStatus"] = "paid";
        updateDoc.$set["payment.paidAt"] = now;

        // Auto confirm order nếu đang pending
        if (order.status === "pending") {
          updateDoc.$set.status = "confirmed";
          updateDoc.$set.confirmedAt = now;
          updateDoc.$push.statusHistory = {
            status: "confirmed",
            updatedAt: now,
            note: "Tự động xác nhận sau khi thanh toán thành công",
          };
        }
      } else {
        // Thanh toán thất bại
        updateDoc.$set["payment.paymentStatus"] = "failed";
        console.log(`Thanh toán VNPAY thất bại cho đơn hàng ${order.code}`);
      }

      // ATOMIC OPERATION: Chỉ update nếu chưa processed
      const updatedOrder = await Order.findOneAndUpdate(
        {
          _id: order._id,
          $or: [
            { "payment.vnpayCallbackProcessed": { $ne: true } },
            { "payment.vnpayIpnProcessed": { $ne: true } },
          ],
        },
        updateDoc,
        { new: true }
      );

      // Nếu không update được = đã được xử lý rồi (idempotency protection)
      if (!updatedOrder) {
        console.log(
          `[IDEMPOTENCY] Giao dịch đã được xử lý trước đó: ${vnpayTransactionNo}`
        );
        return {
          success: true,
          message: "Giao dịch đã được xử lý trước đó",
          data: {
            orderId: order._id,
            orderCode: order.code,
            amount: order.totalAfterDiscountAndShipping,
            paymentStatus: order.payment.paymentStatus,
            alreadyProcessed: true,
          },
        };
      }

      // VNPAY: KHÔNG TỰ ĐỘNG TRỪ KHO Ở ĐÂY
      // Inventory sẽ được trừ KHI GÁN SHIPPER (assignOrderToShipper)
      // VNPAY FAILED: Inventory chưa bao giờ được trừ nên không cần hoàn

      // VNPAY: KHÔNG TỰ ĐỘNG TRỪ KHO Ở ĐÂY
      // Inventory sẽ được trừ KHI GÁN SHIPPER (assignOrderToShipper)
      // VNPAY FAILED: Inventory chưa bao giờ được trừ nên không cần hoàn

      return {
        success: responseCode === "00",
        message:
          responseCode === "00"
            ? "Thanh toán thành công"
            : "Thanh toán thất bại",
        data: {
          orderId: updatedOrder._id,
          orderCode: updatedOrder.code,
          amount: updatedOrder.totalAfterDiscountAndShipping,
          paymentStatus: updatedOrder.payment.paymentStatus,
          orderStatus: updatedOrder.status,
        },
      };
    } catch (error) {
      console.error("Lỗi xử lý kết quả thanh toán:", error);
      return {
        success: false,
        message: error.message || "Lỗi xử lý kết quả thanh toán",
        data: vnpayParams,
      };
    }
  },

  /**
   * Xử lý và verify kết quả thanh toán từ VNPAY callback
   * @param {Object} vnpParams - Tham số từ VNPAY
   * @returns {Object} - Kết quả xử lý thanh toán
   */
  processVnpayReturn: async (vnpParams) => {
    try {
      console.log("VNPAY Return Callback:", JSON.stringify(vnpParams));

      // Xử lý kết quả thanh toán
      const paymentResult = await paymentService.processPaymentResult(
        vnpParams
      );

      return {
        success: paymentResult.success,
        message: paymentResult.message,
        orderId: paymentResult.data?.orderId || null,
      };
    } catch (error) {
      console.error("Lỗi xử lý callback VNPAY:", error);
      return {
        success: false,
        message: "Có lỗi xảy ra khi xử lý thanh toán",
        orderId: null,
      };
    }
  },

  /**
   * Xử lý thông báo tự động từ VNPAY (IPN)
   * @param {Object} vnpParams - Tham số từ VNPAY
   * @returns {Object} - Kết quả xử lý
   */
  processVnpayIpn: async (vnpParams) => {
    try {
      console.log("VNPAY IPN Received:", JSON.stringify(vnpParams));

      // Kiểm tra mã giao dịch và thông tin cơ bản
      if (!vnpParams.vnp_TxnRef || !vnpParams.vnp_ResponseCode) {
        console.log("IPN thiếu thông tin cần thiết");
        return {
          RspCode: "99",
          Message: "Thiếu thông tin giao dịch",
        };
      }

      // ATOMIC IPN IDEMPOTENCY - Xử lý IPN với atomic update
      const vnpayTransactionNo = vnpParams.vnp_TransactionNo;
      const txnRef = vnpParams.vnp_TxnRef;

      // Xác thực chữ ký
      const verifyResult = paymentService.verifyVnpayReturn(vnpParams);

      // Nếu mã phản hồi là "00" (thành công) và đã xác thực chữ ký
      if (
        vnpParams.vnp_ResponseCode === "00" &&
        (verifyResult.success || process.env.NODE_ENV === "development")
      ) {
        // Xử lý kết quả thanh toán (đã có atomic update bên trong processPaymentResult)
        const paymentResult = await paymentService.processPaymentResult(
          vnpParams
        );

        // ATOMIC UPDATE - Mark IPN as processed chỉ nếu chưa processed
        if (paymentResult.success && paymentResult.data?.orderId) {
          const ipnUpdate = await Order.findOneAndUpdate(
            {
              _id: paymentResult.data.orderId,
              "payment.vnpayIpnProcessed": { $ne: true },
            },
            {
              $set: {
                "payment.vnpayIpnProcessed": true,
                "payment.vnpayIpnProcessedAt": new Date(),
              },
            },
            { new: true }
          );

          if (!ipnUpdate) {
            console.log(
              `[IDEMPOTENCY] IPN đã được xử lý trước đó cho orderId: ${paymentResult.data.orderId}`
            );
          }
        }

        // Trường hợp không tìm thấy đơn hàng
        if (
          !paymentResult.success &&
          paymentResult.message === "Không tìm thấy đơn hàng"
        ) {
          console.log(
            `IPN: Không tìm thấy đơn hàng cho mã giao dịch ${vnpParams.vnp_TxnRef}, nhưng vẫn trả về thành công`
          );
          // Vẫn trả về thành công để VNPAY không gửi lại yêu cầu
          return {
            RspCode: "00",
            Message: "Confirmed",
          };
        }

        return {
          RspCode: paymentResult.success ? "00" : "99",
          Message: paymentResult.success ? "Confirmed" : "Failed",
        };
      }

      // Nếu thanh toán thất bại từ phía VNPAY, vẫn trả về thành công để VNPAY không gửi lại IPN
      if (vnpParams.vnp_ResponseCode !== "00") {
        console.log(
          `IPN: Giao dịch ${vnpParams.vnp_TxnRef} thất bại với mã ${vnpParams.vnp_ResponseCode}`
        );
        return {
          RspCode: "00",
          Message: "Confirmed",
        };
      }

      // Các trường hợp khác
      return {
        RspCode: "00",
        Message: "Confirmed",
      };
    } catch (error) {
      console.error("Lỗi xử lý IPN VNPAY:", error);
      // Vẫn trả về thành công để VNPAY không gửi lại IPN
      return {
        RspCode: "00",
        Message: "Confirmed",
      };
    }
  },

  /**
   * Tạo URL thanh toán lại cho đơn hàng
   * @param {String} orderId - ID đơn hàng cần thanh toán lại
   * @param {String} ipAddr - IP của người dùng
   * @param {String} returnUrl - URL callback sau khi thanh toán
   * @returns {Object} - Thông tin URL thanh toán và kết quả
   */
  createRepaymentUrl: async (orderId, ipAddr, returnUrl) => {
    try {
      // Tìm đơn hàng trong cơ sở dữ liệu
      const order = await Order.findById(orderId);

      if (!order) {
        throw new ApiError(404, "Không tìm thấy đơn hàng");
      }

      // Kiểm tra phương thức thanh toán
      if (order.payment.method !== "VNPAY") {
        throw new ApiError(400, "Đơn hàng này không sử dụng phương thức VNPAY");
      }

      // Kiểm tra trạng thái đơn hàng
      if (!["pending", "confirmed"].includes(order.status)) {
        throw new ApiError(
          400,
          "Không thể thanh toán lại đơn hàng ở trạng thái này"
        );
      }

      // Kiểm tra nếu đơn hàng có yêu cầu hủy đang chờ xử lý
      if (order.hasCancelRequest) {
        throw new ApiError(
          400,
          "Đơn hàng có yêu cầu hủy đang chờ xử lý, không thể thanh toán lại"
        );
      }

      // Kiểm tra trạng thái thanh toán
      if (order.payment.paymentStatus === "paid") {
        throw new ApiError(400, "Đơn hàng này đã được thanh toán");
      }

      // Tạo URL thanh toán
      const paymentUrl = await paymentService.createVnpayPaymentUrl({
        orderId: order._id,
        amount: order.totalAfterDiscountAndShipping,
        orderInfo: `Thanh toan don hang ${order.code}`,
        ipAddr: ipAddr || "127.0.0.1",
        returnUrl: returnUrl,
      });

      return {
        success: true,
        message: "Đã tạo URL thanh toán lại",
        data: {
          paymentUrl,
          order: {
            _id: order._id,
            code: order.code,
            totalAmount: order.totalAfterDiscountAndShipping,
          },
        },
      };
    } catch (error) {
      console.error("Lỗi tạo URL thanh toán lại:", error);
      throw error;
    }
  },
};

module.exports = paymentService;
