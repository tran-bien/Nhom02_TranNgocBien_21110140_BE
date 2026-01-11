const jwt = require("jsonwebtoken");
// Tránh circular dependency bằng cách import trực tiếp
const User = require("../../models/user");
const Session = require("../../models/session");
const asyncHandler = require("express-async-handler");
const ApiError = require("@utils/ApiError");
const { cleanSessions } = require("@services/session.service");

// HYBRID CLEANUP STRATEGY: TTL Index (primary) + Debounce (fallback)
let lastCleanupTime = 0;
let isCleanupRunning = false; // Prevent race conditions
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes
// Reason: TTL handles most cleanup, so we only need to clean inactive sessions less frequently

// FIXED Bug #53: Consecutive failure tracking và alert mechanism
let consecutiveCleanupFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 5;
const alertCleanupFailure = (failureCount, error) => {
  console.error(
    `[CLEANUP ALERT] ${failureCount} consecutive failures! Last error:`,
    error.message
  );
  // TODO: Có thể gửi notification cho admin qua email/slack nếu cần
  // Ví dụ: await notificationService.alertAdmin('CLEANUP_FAILURE', { failureCount, error: error.message });
};

// Bảo vệ các route yêu cầu đăng nhập
exports.protect = asyncHandler(async (req, res, next) => {
  // HYBRID CLEANUP: Only clean inactive sessions (TTL handles expired)
  const now = Date.now();
  if (now - lastCleanupTime > CLEANUP_INTERVAL && !isCleanupRunning) {
    lastCleanupTime = now;
    isCleanupRunning = true;

    // NON-BLOCKING: Run cleanup in background, don't await
    // Request continues immediately without waiting for cleanup to finish
    cleanSessions()
      .then(() => {
        // FIXED Bug #53: Reset counter on success
        consecutiveCleanupFailures = 0;
      })
      .catch((err) => {
        // FIXED Bug #53: Track consecutive failures và alert
        consecutiveCleanupFailures++;
        console.error("[CLEANUP ERROR]", err.message);
        if (consecutiveCleanupFailures >= MAX_CONSECUTIVE_FAILURES) {
          alertCleanupFailure(consecutiveCleanupFailures, err);
          consecutiveCleanupFailures = 0; // Reset để tránh spam alert
        }
      })
      .finally(() => {
        isCleanupRunning = false;
      });
  }

  const token = req.headers.authorization?.startsWith("Bearer")
    ? req.headers.authorization.split(" ")[1]
    : null;

  // Kiểm tra token
  if (!token) {
    throw new ApiError(401, "Không có quyền truy cập, vui lòng đăng nhập");
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Tìm người dùng
    const user = await User.findById(decoded.id).select("-password");

    // Không tìm thấy người dùng
    if (!user) {
      throw new ApiError(401, "Không tìm thấy người dùng");
    }

    // Người dùng bị khóa
    if (!user.isActive || user.blockedAt) {
      const blockReason = user.blockReason
        ? `Lý do: ${user.blockReason}`
        : "Vui lòng liên hệ quản trị viên để được hỗ trợ";

      throw new ApiError(
        401,
        `Tài khoản của bạn đã bị vô hiệu hóa. ${blockReason}`
      );
    }

    // Tìm session theo token chính xác
    const session = await Session.findOne({
      token,
      user: user._id,
      isActive: true,
    });

    // Nếu không có session hợp lệ
    if (!session) {
      throw new ApiError(
        401,
        "Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại"
      );
    }

    // Kiểm tra hết hạn
    if (new Date() > new Date(session.expiresAt)) {
      session.isActive = false;
      await session.save();
      throw new ApiError(
        401,
        "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"
      );
    }

    // Cập nhật thời gian hoạt động
    session.lastActive = new Date();
    await session.save();

    // Đặt session vào req
    req.token = token;
    req.user = user;
    req.session = session;

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const errorMessage =
      error.name === "TokenExpiredError"
        ? "Token đã hết hạn, vui lòng đăng nhập lại"
        : "Token không hợp lệ, vui lòng đăng nhập lại";

    throw new ApiError(401, errorMessage);
  }
});

// Middleware cho Admin
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  throw new ApiError(403, "Bạn không có quyền admin");
};

// Middleware cho phép cả Staff và Admin truy cập
exports.requireStaff = (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Bạn cần đăng nhập để truy cập");
  }

  if (req.user.role !== "staff" && req.user.role !== "admin") {
    throw new ApiError(403, "Bạn không có quyền truy cập tính năng này");
  }

  next();
};

// Middleware chỉ dành riêng cho Admin
exports.requireAdminOnly = (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Bạn cần đăng nhập để truy cập");
  }

  if (req.user.role !== "admin") {
    throw new ApiError(403, "Tính năng này chỉ dành cho quản trị viên cấp cao");
  }

  next();
};

// Middleware cho phép cả Staff và Admin có quyền CRUD
exports.requireStaffOrAdmin = (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Bạn cần đăng nhập để truy cập");
  }

  if (req.user.role !== "staff" && req.user.role !== "admin") {
    throw new ApiError(403, "Bạn không có quyền truy cập tính năng này");
  }

  // Cả Staff và Admin đều có quyền CRUD
  next();
};

// Middleware cho Staff - chỉ cho phép xem (READ ONLY)
exports.requireStaffReadOnly = (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Bạn cần đăng nhập để truy cập");
  }

  if (req.user.role !== "staff" && req.user.role !== "admin") {
    throw new ApiError(403, "Bạn không có quyền truy cập tính năng này");
  }

  // Nếu là staff, chỉ cho phép GET requests
  if (req.user.role === "staff" && req.method !== "GET") {
    throw new ApiError(
      403,
      "Staff chỉ có quyền xem, không thể thực hiện thao tác này"
    );
  }

  next();
};

// Middleware kiểm tra xác thực
exports.isAuthenticated = (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Bạn cần đăng nhập để thực hiện chức năng này");
  }
  next();
};

// Middleware cho Shipper
exports.requireShipper = (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Bạn cần đăng nhập để truy cập");
  }

  if (req.user.role !== "shipper") {
    throw new ApiError(403, "Tính năng này chỉ dành cho shipper");
  }

  next();
};

/**
 * Optional Auth Middleware
 * Attach user to req nếu có valid token, nhưng không bắt buộc
 * Dùng cho public routes cần personalization (AI chat, recommendations, etc.)
 */
exports.optionalAuth = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.startsWith("Bearer")
    ? req.headers.authorization.split(" ")[1]
    : null;

  // Không có token -> tiếp tục như guest
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (user && user.isActive && !user.blockedAt) {
      // Check session
      const session = await Session.findOne({
        token,
        user: user._id,
        isActive: true,
      });

      if (session && new Date() < new Date(session.expiresAt)) {
        req.user = user;
        req.token = token;
        req.session = session;
      }
    }
  } catch (error) {
    // Token invalid/expired -> tiếp tục như guest (không throw error)
    console.warn("[OPTIONAL_AUTH] Token invalid, continuing as guest");
  }

  next();
});
