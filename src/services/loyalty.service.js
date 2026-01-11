const { User, Order, Review } = require("@models");
const LoyaltyTier = require("../models/loyaltyTier");
const LoyaltyTransaction = require("../models/loyaltyTransaction");
const ApiError = require("@utils/ApiError");
const paginate = require("@utils/pagination");
const { createSlug } = require("@utils/slugify");
const mongoose = require("mongoose"); // FIXED: Thêm import mongoose

// ============================================================
// FIX CRITICAL 1.3: In-memory lock với size limit và cleanup
// ============================================================
const expiringLocks = new Map();
const LOCK_CONFIG = {
  maxLockDurationMs: 10 * 1000, // Lock tối đa 10 giây
  maxMapSize: 1000, // Giới hạn kích thước Map
  cleanupIntervalMs: 10 * 1000, // Cleanup mỗi 10 giây
};

const acquireExpireLock = (userId) => {
  const userKey = userId.toString();
  const now = Date.now();

  // FIX CRITICAL 1.3: Cleanup khi Map quá lớn
  if (expiringLocks.size > LOCK_CONFIG.maxMapSize) {
    console.warn(
      `[LOYALTY] Lock Map size exceeded ${LOCK_CONFIG.maxMapSize}, forcing cleanup`
    );
    const entriesToDelete = [];
    for (const [key, timestamp] of expiringLocks.entries()) {
      if (now - timestamp > LOCK_CONFIG.maxLockDurationMs) {
        entriesToDelete.push(key);
      }
    }
    entriesToDelete.forEach((k) => expiringLocks.delete(k));

    // Nếu vẫn còn quá lớn, xóa 50% entries cũ nhất
    if (expiringLocks.size > LOCK_CONFIG.maxMapSize * 0.8) {
      const sortedEntries = [...expiringLocks.entries()].sort(
        (a, b) => a[1] - b[1]
      );
      const deleteCount = Math.floor(sortedEntries.length * 0.5);
      sortedEntries
        .slice(0, deleteCount)
        .forEach(([k]) => expiringLocks.delete(k));
    }
  }

  if (expiringLocks.has(userKey)) {
    const lockTime = expiringLocks.get(userKey);
    // Auto-release nếu lock quá cũ
    if (now - lockTime > LOCK_CONFIG.maxLockDurationMs) {
      expiringLocks.delete(userKey);
    } else {
      return false; // Lock đã được giữ
    }
  }
  expiringLocks.set(userKey, now);
  return true;
};

const releaseExpireLock = (userId) => {
  expiringLocks.delete(userId.toString());
};

// FIX CRITICAL 1.3: Improved cleanup với size monitoring
setInterval(() => {
  const now = Date.now();
  for (const [userKey, timestamp] of expiringLocks.entries()) {
    if (now - timestamp > LOCK_CONFIG.maxLockDurationMs) {
      expiringLocks.delete(userKey);
    }
  }

  // Log size để monitor
  if (expiringLocks.size > 100) {
    console.log(`[LOYALTY] Lock Map size: ${expiringLocks.size}`);
  }
}, LOCK_CONFIG.cleanupIntervalMs);

const loyaltyService = {
  /**
   * Tính điểm từ đơn hàng (1 điểm / 1000đ)
   * FIX Issue #2: Thêm overflow check để tránh integer overflow
   */
  calculatePointsFromOrder: (orderTotal) => {
    const points = Math.floor(orderTotal / 1000);
    // Check overflow - MAX_SAFE_INTEGER = 9007199254740991
    if (
      points > Number.MAX_SAFE_INTEGER ||
      points < 0 ||
      !Number.isFinite(points)
    ) {
      console.error(
        `[LOYALTY] Points overflow detected: orderTotal=${orderTotal}, points=${points}`
      );
      return 0; // Return 0 để tránh data corruption
    }
    return points;
  },

  /**
   * Thêm điểm cho user
   */
  addPoints: async (userId, points, options = {}) => {
    const { source, order, review, description, expiresAt, processedBy } =
      options;

    const user = await User.findById(userId).populate("loyalty.tier");

    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    // Nhân với multiplier nếu có tier
    const multiplier = user.loyalty?.tier?.benefits?.pointsMultiplier || 1;
    const finalPoints = Math.floor(points * multiplier);

    const balanceBefore = user.loyalty?.points || 0;
    const balanceAfter = balanceBefore + finalPoints;

    // Tạo transaction
    await LoyaltyTransaction.create({
      user: userId,
      type: "EARN",
      points: finalPoints,
      balanceBefore,
      balanceAfter,
      source,
      order,
      review,
      description:
        description || `Tích ${finalPoints} điểm từ ${source.toLowerCase()}`,
      expiresAt: expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 năm
      processedBy,
    });

    // Cập nhật user
    user.loyalty = user.loyalty || {};
    user.loyalty.points = balanceAfter;
    user.loyalty.totalEarned = (user.loyalty.totalEarned || 0) + finalPoints;
    await user.save();

    // Auto update tier
    await loyaltyService.updateUserTier(userId);

    return {
      success: true,
      pointsAdded: finalPoints,
      newBalance: balanceAfter,
    };
  },

  /**
   * Trừ điểm (redeem hoặc expire)
   */
  deductPoints: async (userId, points, options = {}) => {
    const { type = "REDEEM", source, description, processedBy } = options;

    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    const currentPoints = user.loyalty?.points || 0;

    if (currentPoints < points) {
      throw new ApiError(400, "Không đủ điểm để thực hiện");
    }

    const balanceBefore = currentPoints;
    const balanceAfter = currentPoints - points;

    // Tạo transaction
    await LoyaltyTransaction.create({
      user: userId,
      type,
      points: -points,
      balanceBefore,
      balanceAfter,
      source: source || "MANUAL",
      description: description || `Sử dụng ${points} điểm`,
      processedBy,
    });

    // Cập nhật user
    user.loyalty.points = balanceAfter;
    user.loyalty.totalRedeemed = (user.loyalty.totalRedeemed || 0) + points;

    // FIXED: Trừ cả totalEarned khi trả hàng (source = "RETURN")
    // Để phản ánh đúng tổng điểm tích lũy từ trước đến nay
    if (source === "RETURN") {
      const currentTotalEarned = user.loyalty.totalEarned || 0;
      user.loyalty.totalEarned = Math.max(0, currentTotalEarned - points);
      console.log(
        `[LOYALTY] Trừ totalEarned: ${currentTotalEarned} -> ${user.loyalty.totalEarned} (trừ ${points} điểm do trả hàng)`
      );
    }

    await user.save();

    // Auto update tier
    await loyaltyService.updateUserTier(userId);

    return {
      success: true,
      pointsDeducted: points,
      newBalance: balanceAfter,
    };
  },

  /**
   * FIXED: Tự động cập nhật tier của user dựa trên DOANH SỐ 12 THÁNG
   * (không phải điểm tích lũy hiện tại)
   */
  updateUserTier: async (userId) => {
    const user = await User.findById(userId);

    if (!user) return;

    // FIXED: Tính tổng doanh số từ orders delivered trong 12 tháng gần nhất
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const spendingResult = await Order.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          status: "delivered",
          deliveredAt: { $gte: twelveMonthsAgo, $ne: null }, // FIXED: Chặn deliveredAt null
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: null,
          totalSpending: { $sum: "$totalAfterDiscountAndShipping" },
        },
      },
    ]);

    const totalSpending =
      spendingResult.length > 0 ? spendingResult[0].totalSpending : 0;

    console.log(
      `[Tier Update] User ${userId} - Doanh số 12 tháng: ${totalSpending.toLocaleString(
        "vi-VN"
      )}đ`
    );

    // Tìm tier phù hợp dựa trên doanh số
    const tier = await LoyaltyTier.findOne({
      isActive: true,
      minSpending: { $lte: totalSpending },
      $or: [{ maxSpending: { $gte: totalSpending } }, { maxSpending: null }],
    }).sort({ minSpending: -1 });

    if (!tier) {
      console.log(
        `[Tier Update] Không tìm thấy tier phù hợp cho doanh số ${totalSpending.toLocaleString(
          "vi-VN"
        )}đ`
      );
      return;
    }

    // Nếu tier thay đổi
    if (
      !user.loyalty.tier ||
      user.loyalty.tier.toString() !== tier._id.toString()
    ) {
      const oldTierName = user.loyalty?.tierName || "Chưa có";

      user.loyalty.tier = tier._id;
      user.loyalty.tierName = tier.name;
      user.loyalty.lastTierUpdate = new Date();
      await user.save();

      console.log(
        `[Tier Update] User ${user.name} lên hạng: ${oldTierName} → ${
          tier.name
        } (Doanh số: ${totalSpending.toLocaleString("vi-VN")}đ)`
      );

      // Gửi notification lên hạng
      try {
        const notificationService = require("./notification.service");
        await notificationService.send(userId, "LOYALTY_TIER_UP", {
          tierName: tier.name,
          multiplier: tier.benefits?.pointsMultiplier || 1,
          currentPoints: user.loyalty?.points || 0,
          totalSpending: totalSpending,
          prioritySupport: tier.benefits?.prioritySupport || false,
        });
      } catch (error) {
        console.error("[Loyalty] Lỗi gửi notification tier up:", error.message);
      }

      return {
        tierChanged: true,
        oldTier: oldTierName,
        newTier: tier.name,
      };
    }

    return { tierChanged: false };
  },

  /**
   * Lấy lịch sử giao dịch điểm
   * Tự động expire các điểm hết hạn trước khi query
   */
  getUserTransactions: async (userId, query = {}) => {
    // FIX BUG #10: Check lock trước khi auto-expire
    const canExpire = acquireExpireLock(userId);

    // AUTO-EXPIRE logic: Tự động expire các điểm hết hạn
    const now = new Date();
    const expiredTransactions = await LoyaltyTransaction.find({
      user: userId, // Chỉ expire cho user hiện tại
      type: "EARN",
      isExpired: false,
      expiresAt: { $lt: now },
    });

    if (canExpire && expiredTransactions.length > 0) {
      console.log(
        `[AUTO-EXPIRE] Tìm thấy ${expiredTransactions.length} transaction(s) hết hạn cho user ${userId}`
      );

      // Tính tổng điểm cần trừ
      const totalExpiredPoints = expiredTransactions.reduce(
        (sum, tx) => sum + tx.points,
        0
      );

      try {
        // Atomic update: Trừ điểm 1 lần duy nhất
        const user = await User.findById(userId);
        if (user && user.loyalty.points >= totalExpiredPoints) {
          const balanceBefore = user.loyalty.points;
          const balanceAfter = balanceBefore - totalExpiredPoints;

          // Update user points
          user.loyalty.points = balanceAfter;
          // FIX BUG #14: EXPIRE đến từ hết hạn, KHÔNG phải redeem bởi user
          // Không tăng totalRedeemed, chỉ tracking totalExpired (optional)
          // user.loyalty.totalExpired = (user.loyalty.totalExpired || 0) + totalExpiredPoints;
          await user.save();

          // Tạo 1 expire transaction tổng hợp
          await LoyaltyTransaction.create({
            user: userId,
            type: "EXPIRE",
            points: -totalExpiredPoints,
            balanceBefore,
            balanceAfter,
            source: "MANUAL",
            description: `Hết hạn ${totalExpiredPoints} điểm từ ${expiredTransactions.length} transaction(s)`,
          });

          // Đánh dấu tất cả transactions đã expire (bulk update)
          await LoyaltyTransaction.updateMany(
            {
              _id: { $in: expiredTransactions.map((tx) => tx._id) },
            },
            { isExpired: true }
          );

          console.log(
            `[AUTO-EXPIRE] Đã expire ${totalExpiredPoints} điểm từ ${expiredTransactions.length} transactions`
          );

          // Update tier sau khi trừ điểm
          await loyaltyService.updateUserTier(userId);
        }
      } catch (error) {
        console.error(
          `[AUTO-EXPIRE] Lỗi khi expire transactions:`,
          error.message
        );
      } finally {
        // FIX BUG #10: Always release lock
        if (canExpire) {
          releaseExpireLock(userId);
        }
      }
    } else if (!canExpire) {
      console.log(
        `[AUTO-EXPIRE] Skipped - another request is already processing for user ${userId}`
      );
    }

    const { page = 1, limit = 20, type } = query;

    const filter = { user: userId };
    if (type) {
      filter.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      LoyaltyTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("order", "code totalAfterDiscountAndShipping")
        .populate("review", "rating content"),
      LoyaltyTransaction.countDocuments(filter),
    ]);

    return {
      success: true,
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  },

  /**
   * Lấy thống kê loyalty của user
   * Tự động expire các điểm hết hạn trước khi tính toán stats
   */
  getUserLoyaltyStats: async (userId) => {
    // FIX BUG #10: Check lock trước khi auto-expire
    const canExpire = acquireExpireLock(userId);

    // AUTO-EXPIRE logic: Expire điểm hết hạn trước khi tính stats
    const now = new Date();
    const expiredTransactions = await LoyaltyTransaction.find({
      user: userId,
      type: "EARN",
      isExpired: false,
      expiresAt: { $lt: now },
    });

    if (canExpire && expiredTransactions.length > 0) {
      console.log(
        `[STATS AUTO-EXPIRE] Found ${expiredTransactions.length} expired loyalty transactions for user ${userId}`
      );

      const totalExpiredPoints = expiredTransactions.reduce(
        (sum, tx) => sum + tx.points,
        0
      );

      try {
        const user = await User.findById(userId);
        if (user && user.loyalty.points >= totalExpiredPoints) {
          const balanceBefore = user.loyalty.points;
          const balanceAfter = balanceBefore - totalExpiredPoints;

          user.loyalty.points = balanceAfter;
          // FIX BUG #14: EXPIRE đến từ hết hạn, KHÔNG phải redeem bởi user
          // Không tăng totalRedeemed
          await user.save();

          await LoyaltyTransaction.create({
            user: userId,
            type: "EXPIRE",
            points: -totalExpiredPoints,
            balanceBefore,
            balanceAfter,
            source: "MANUAL",
            description: `Hết hạn ${totalExpiredPoints} điểm từ ${expiredTransactions.length} transaction(s)`,
          });

          await LoyaltyTransaction.updateMany(
            { _id: { $in: expiredTransactions.map((tx) => tx._id) } },
            { isExpired: true }
          );

          await loyaltyService.updateUserTier(userId);
        }
      } catch (error) {
        console.error(
          `[STATS AUTO-EXPIRE] Error expiring transactions:`,
          error.message
        );
      } finally {
        // FIX BUG #10: Always release lock
        if (canExpire) {
          releaseExpireLock(userId);
        }
      }
    } else if (!canExpire) {
      console.log(
        `[STATS AUTO-EXPIRE] Skipped - another request is already processing for user ${userId}`
      );
    }

    const user = await User.findById(userId).populate("loyalty.tier");

    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    // Tính điểm sắp hết hạn (30 ngày tới)
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiringTransactions = await LoyaltyTransaction.find({
      user: userId,
      type: "EARN",
      isExpired: false,
      expiresAt: { $lte: thirtyDaysFromNow },
    });

    const expiringPoints = expiringTransactions.reduce(
      (sum, tx) => sum + tx.points,
      0
    );

    // Lấy tier tiếp theo
    const nextTier = await LoyaltyTier.findOne({
      isActive: true,
      minPoints: { $gt: user.loyalty.points },
    }).sort({ minPoints: 1 });

    return {
      success: true,
      loyalty: {
        currentPoints: user.loyalty.points,
        totalEarned: user.loyalty.totalEarned,
        totalRedeemed: user.loyalty.totalRedeemed,
        tier: user.loyalty.tier,
        tierName: user.loyalty.tierName,
        expiringPoints,
        nextTier: nextTier
          ? {
              name: nextTier.name,
              minPoints: nextTier.minPoints,
              pointsNeeded: nextTier.minPoints - user.loyalty.points,
            }
          : null,
      },
    };
  },

  /**
   * Lấy danh sách tiers cho user (chỉ hiển thị tiers active)
   */
  getAllTiers: async (query = {}) => {
    const { isActive = true } = query;

    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === "true" || isActive === true;
    }

    const tiers = await LoyaltyTier.find(filter)
      .select(
        "name slug minSpending maxSpending benefits displayOrder icon color description isActive"
      )
      .sort({ displayOrder: 1, minSpending: 1 });

    return {
      success: true,
      tiers,
    };
  },
};

/**
 * ADMIN LOYALTY TIER SERVICE - Quản lý loyalty tiers
 */
const adminLoyaltyTierService = {
  /**
   * Lấy danh sách tất cả loyalty tiers
   */
  getAllTiers: async (query = {}) => {
    const { page = 1, limit = 50, isActive } = query;

    const filter = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === "true" || isActive === true;
    }

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { displayOrder: 1, minSpending: 1 },
      select: "-__v",
    };

    const result = await paginate(LoyaltyTier, filter, options);

    return {
      success: true,
      ...result,
    };
  },

  /**
   * Lấy chi tiết tier
   */
  getTierById: async (tierId) => {
    const tier = await LoyaltyTier.findById(tierId);

    if (!tier) {
      throw new ApiError(404, "Không tìm thấy loyalty tier");
    }

    // Count users in this tier
    const userCount = await User.countDocuments({ "loyalty.tier": tierId });

    return {
      success: true,
      tier: {
        ...tier.toObject(),
        userCount,
      },
    };
  },

  /**
   * Tạo tier mới
   */
  createTier: async (tierData) => {
    // Kiểm tra tên tier đã tồn tại
    const existingTier = await LoyaltyTier.findOne({ name: tierData.name });
    if (existingTier) {
      throw new ApiError(400, "Tên tier đã tồn tại");
    }

    // FIXED: Kiểm tra minSpending đã được dùng chưa
    const existingMinSpending = await LoyaltyTier.findOne({
      minSpending: tierData.minSpending,
    });
    if (existingMinSpending) {
      throw new ApiError(
        400,
        "Doanh số tối thiểu này đã được sử dụng bởi Hạng khác"
      );
    }

    // FIXED: Validate overlap tier ranges theo minSpending/maxSpending
    const { minSpending, maxSpending } = tierData;
    if (maxSpending && maxSpending <= minSpending) {
      throw new ApiError(
        400,
        "Doanh số tối đa phải lớn hơn doanh số tối thiểu"
      );
    }

    // Kiểm tra overlap với các tier khác
    const allTiers = await LoyaltyTier.find({});
    for (const tier of allTiers) {
      const tierMin = tier.minSpending;
      const tierMax = tier.maxSpending || Infinity;
      const newMin = minSpending;
      const newMax = maxSpending || Infinity;

      // Check overlap: new tier overlap với existing tier
      const hasOverlap =
        (newMin >= tierMin && newMin < tierMax) || // newMin nằm trong range
        (newMax > tierMin && newMax <= tierMax) || // newMax nằm trong range
        (newMin <= tierMin && newMax >= tierMax); // new tier bao trùm existing

      if (hasOverlap) {
        throw new ApiError(
          400,
          `Hạng mới trùng với hạng "${tier.name}" (${tierMin.toLocaleString(
            "vi-VN"
          )}-${tierMax === Infinity ? "∞" : tierMax.toLocaleString("vi-VN")}đ)`
        );
      }
    }

    // Tự động tạo slug
    tierData.slug = createSlug(tierData.name);

    // Set default benefits nếu không có
    if (!tierData.benefits) {
      tierData.benefits = {};
    }
    if (!tierData.benefits.pointsMultiplier) {
      tierData.benefits.pointsMultiplier = 1;
    }
    if (tierData.benefits.prioritySupport === undefined) {
      tierData.benefits.prioritySupport = false;
    }

    const tier = await LoyaltyTier.create(tierData);

    return {
      success: true,
      message: "Tạo loyalty tier thành công",
      tier,
    };
  },

  /**
   * Cập nhật tier
   */
  updateTier: async (tierId, tierData) => {
    const tier = await LoyaltyTier.findById(tierId);

    if (!tier) {
      throw new ApiError(404, "Không tìm thấy loyalty tier");
    }

    // Nếu thay đổi name, kiểm tra trùng lặp
    if (tierData.name && tierData.name !== tier.name) {
      const existingTier = await LoyaltyTier.findOne({
        name: tierData.name,
        _id: { $ne: tierId },
      });
      if (existingTier) {
        throw new ApiError(400, "Tên tier đã tồn tại");
      }
      // Update slug
      tierData.slug = createSlug(tierData.name);
    }

    // Nếu thay đổi minSpending, kiểm tra trùng lặp
    if (
      tierData.minSpending !== undefined &&
      tierData.minSpending !== tier.minSpending
    ) {
      const existingMinSpending = await LoyaltyTier.findOne({
        minSpending: tierData.minSpending,
        _id: { $ne: tierId },
      });
      if (existingMinSpending) {
        throw new ApiError(
          400,
          "Doanh số tối thiểu này đã được sử dụng bởi tier khác"
        );
      }
    }

    // Validate maxSpending > minSpending
    const finalMinSpending =
      tierData.minSpending !== undefined
        ? tierData.minSpending
        : tier.minSpending;
    const finalMaxSpending =
      tierData.maxSpending !== undefined
        ? tierData.maxSpending
        : tier.maxSpending;

    if (finalMaxSpending && finalMaxSpending <= finalMinSpending) {
      throw new ApiError(
        400,
        "Doanh số tối đa phải lớn hơn doanh số tối thiểu"
      );
    }

    // FIXED: Validate overlap với các tier khác theo minSpending/maxSpending
    const allTiers = await LoyaltyTier.find({ _id: { $ne: tierId } });
    for (const otherTier of allTiers) {
      const tierMin = otherTier.minSpending;
      const tierMax = otherTier.maxSpending || Infinity;
      const newMin = finalMinSpending;
      const newMax = finalMaxSpending || Infinity;

      const hasOverlap =
        (newMin >= tierMin && newMin < tierMax) ||
        (newMax > tierMin && newMax <= tierMax) ||
        (newMin <= tierMin && newMax >= tierMax);

      if (hasOverlap) {
        throw new ApiError(
          400,
          `Hạng mới trùng với hạng "${
            otherTier.name
          }" (${tierMin.toLocaleString("vi-VN")}-${
            otherTier.name
          }" (${tierMin.toLocaleString("vi-VN")}-${
            tierMax === Infinity ? "∞" : tierMax.toLocaleString("vi-VN")
          }đ)`
        );
      }
    }

    // Update tier
    Object.assign(tier, tierData);
    await tier.save();

    // FIX Bug #11: Batch processing với pagination để tránh memory issues
    const BATCH_SIZE = 100;
    const userCount = await User.countDocuments({ "loyalty.tier": tierId });
    const totalBatches = Math.ceil(userCount / BATCH_SIZE);

    console.log(
      `[LOYALTY] Re-calculating tier for ${userCount} users in ${totalBatches} batches`
    );

    for (let batch = 0; batch < totalBatches; batch++) {
      const users = await User.find({ "loyalty.tier": tierId })
        .skip(batch * BATCH_SIZE)
        .limit(BATCH_SIZE)
        .select("_id");

      // Process batch in parallel with limited concurrency
      const updatePromises = users.map((user) =>
        loyaltyService.updateUserTier(user._id).catch((err) => {
          console.error(
            `[LOYALTY] Failed to update tier for user ${user._id}:`,
            err.message
          );
        })
      );
      await Promise.all(updatePromises);

      console.log(
        `[LOYALTY] Processed batch ${batch + 1}/${totalBatches} (${
          users.length
        } users)`
      );
    }

    return {
      success: true,
      message: "Cập nhật loyalty tier thành công",
      tier,
    };
  },

  /**
   * Xóa tier
   */
  deleteTier: async (tierId) => {
    const tier = await LoyaltyTier.findById(tierId);

    if (!tier) {
      throw new ApiError(404, "Không tìm thấy loyalty tier");
    }

    // Kiểm tra có users đang dùng tier này không
    const userCount = await User.countDocuments({ "loyalty.tier": tierId });

    if (userCount > 0) {
      throw new ApiError(
        400,
        `Không thể xóa tier đang có ${userCount} user(s) sử dụng. Vui lòng chuyển users sang tier khác trước.`
      );
    }

    await tier.deleteOne();

    return {
      success: true,
      message: "Xóa loyalty tier thành công",
    };
  },
};

module.exports = {
  ...loyaltyService,
  adminLoyaltyTierService,
};
