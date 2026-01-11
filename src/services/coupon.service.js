const { Coupon, User, Product, Category, Order, Variant } = require("@models");
const paginate = require("@utils/pagination");
const ApiError = require("@utils/ApiError");
const mongoose = require("mongoose");

const couponService = {
  /**
   * Lấy danh sách coupon công khai đang hoạt động
   * @param {Object} query - Các tham số truy vấn
   * @param {String} userId - ID của người dùng (optional, dùng để filter coupon đã đổi/hết lượt)
   * @returns {Object} - Danh sách coupon phân trang
   */
  getPublicCoupons: async (query = {}, userId = null) => {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt_desc",
      isRedeemable,
    } = query;

    // Xây dựng điều kiện lọc - coupon đang hoạt động
    const filter = {
      status: "active",
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    };

    // Filter by isRedeemable (for loyalty redeem page)
    if (isRedeemable !== undefined) {
      filter.isRedeemable = isRedeemable === "true" || isRedeemable === true;
      // Nếu là coupon đổi điểm, không cần filter isPublic
      // vì coupon đổi điểm thường không public (chỉ dành cho loyalty program)
    } else {
      // Nếu không filter isRedeemable, chỉ lấy coupon công khai
      filter.isPublic = true;
    }

    // FIXED: Sửa logic $expr để xử lý đúng maxUses=0 và maxRedeemPerUser=0 (nghĩa là không giới hạn)
    // Nếu có userId, filter coupon đã hết lượt hoặc user đã đổi đủ số lần
    if (userId) {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      filter.$expr = {
        $and: [
          // FIXED: Nếu có maxUses > 0, chỉ lấy coupon chưa hết lượt sử dụng
          // maxUses = null hoặc maxUses = 0 => không giới hạn
          {
            $or: [
              { $eq: ["$maxUses", null] },
              { $eq: ["$maxUses", 0] },
              { $gt: ["$maxUses", "$currentUses"] },
            ],
          },
          // FIXED: Nếu có maxRedeemPerUser > 0, chỉ lấy coupon user chưa đổi đủ số lần
          // maxRedeemPerUser = null hoặc maxRedeemPerUser = 0 => không giới hạn
          {
            $or: [
              { $eq: ["$maxRedeemPerUser", null] },
              { $eq: ["$maxRedeemPerUser", 0] },
              {
                $lt: [
                  {
                    $ifNull: [
                      {
                        $let: {
                          vars: {
                            usage: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: "$userUsage",
                                    as: "u",
                                    cond: {
                                      $eq: ["$$u.user", userObjectId],
                                    },
                                  },
                                },
                                0,
                              ],
                            },
                          },
                          in: "$$usage.usageCount",
                        },
                      },
                      0,
                    ],
                  },
                  "$maxRedeemPerUser",
                ],
              },
            ],
          },
        ],
      };
    }

    // FIXED Bug #32: Dùng aggregate với priorityValue mapping để sort đúng
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Xây dựng sort options với user preference
    let sortStage = { priorityValue: -1, createdAt: -1 }; // Default
    if (sort) {
      const [field, order] = sort.split("_");
      if (field !== "priority") {
        sortStage = {
          priorityValue: -1,
          [field]: order === "desc" ? -1 : 1,
        };
      }
    }

    const [countResult, coupons] = await Promise.all([
      Coupon.countDocuments(filter),
      Coupon.aggregate([
        { $match: filter },
        {
          $addFields: {
            priorityValue: {
              $switch: {
                branches: [
                  { case: { $eq: ["$priority", "HIGH"] }, then: 3 },
                  { case: { $eq: ["$priority", "MEDIUM"] }, then: 2 },
                  { case: { $eq: ["$priority", "LOW"] }, then: 1 },
                ],
                default: 0,
              },
            },
          },
        },
        { $sort: sortStage },
        { $skip: skip },
        { $limit: limitNum },
        {
          // FIXED Bug #33: Không mix inclusion và exclusion projection
          // Xóa priorityValue bằng cách không include nó
          $project: {
            code: 1,
            description: 1,
            type: 1,
            value: 1,
            maxDiscount: 1,
            minOrderValue: 1,
            startDate: 1,
            endDate: 1,
            isRedeemable: 1,
            pointCost: 1,
            maxRedeemPerUser: 1,
            priority: 1,
            // priorityValue bị loại bỏ vì không include
          },
        },
      ]),
    ]);

    const totalPages = Math.ceil(countResult / limitNum);

    return {
      success: true,
      message: "Lấy danh sách mã giảm giá thành công",
      coupons,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult,
        totalPages,
      },
    };
  },

  /**
   * Lấy danh sách coupon đã thu thập của người dùng
   * @param {String} userId - ID của người dùng
   * @param {Object} query - Các tham số truy vấn
   * @returns {Object} - Danh sách coupon phân trang
   */
  getUserCoupons: async (userId, query = {}) => {
    const {
      page = 1,
      limit = 10,
      status = "active",
      sort = "createdAt_desc",
    } = query;

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    // Xây dựng điều kiện lọc
    let filter = {
      users: { $in: [userId] },
    };

    // Lọc theo trạng thái
    if (status) {
      if (status === "active") {
        filter.status = "active";
        filter.startDate = { $lte: new Date() };
        filter.endDate = { $gte: new Date() };
      } else {
        filter.status = status;
      }
    }

    // Bổ sung lọc coupon đã hết lượt sử dụng tổng (maxUses) và user đã dùng đủ số lần (maxUsagePerUser)
    const userObjectId = new mongoose.Types.ObjectId(userId);
    filter.$expr = {
      $and: [
        // Nếu có maxUses, chỉ lấy coupon chưa hết lượt sử dụng
        {
          $or: [
            { $eq: ["$maxUses", null] },
            { $gt: ["$maxUses", "$currentUses"] },
          ],
        },
        // Nếu có maxUsagePerUser, chỉ lấy coupon user chưa dùng đủ số lần
        {
          $or: [
            { $eq: ["$conditions.maxUsagePerUser", null] },
            {
              $lt: [
                {
                  $ifNull: [
                    {
                      $let: {
                        vars: {
                          usage: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$userUsage",
                                  as: "u",
                                  cond: {
                                    $eq: ["$$u.user", userObjectId],
                                  },
                                },
                              },
                              0,
                            ],
                          },
                        },
                        in: "$$usage.usageCount",
                      },
                    },
                    0,
                  ],
                },
                "$conditions.maxUsagePerUser",
              ],
            },
          ],
        },
      ],
    };

    // FIXED Bug #32: Dùng aggregate với priorityValue mapping
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let sortStage = { priorityValue: -1, createdAt: -1 };
    if (sort) {
      const [field, order] = sort.split("_");
      if (field !== "priority") {
        sortStage = {
          priorityValue: -1,
          [field]: order === "desc" ? -1 : 1,
        };
      }
    }

    const [countResult, coupons] = await Promise.all([
      Coupon.countDocuments(filter),
      Coupon.aggregate([
        { $match: filter },
        {
          $addFields: {
            priorityValue: {
              $switch: {
                branches: [
                  { case: { $eq: ["$priority", "HIGH"] }, then: 3 },
                  { case: { $eq: ["$priority", "MEDIUM"] }, then: 2 },
                  { case: { $eq: ["$priority", "LOW"] }, then: 1 },
                ],
                default: 0,
              },
            },
          },
        },
        { $sort: sortStage },
        { $skip: skip },
        { $limit: limitNum },
        { $project: { priorityValue: 0 } },
      ]),
    ]);

    const totalPages = Math.ceil(countResult / limitNum);

    return {
      success: true,
      message: "Lấy danh sách mã giảm giá đã thu thập thành công",
      coupons,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult,
        totalPages,
      },
    };
  },

  /**
   * Thu thập mã giảm giá
   * @param {String} userId - ID của người dùng
   * @param {String} couponId - ID của coupon
   * @returns {Object} - Kết quả thu thập
   */
  collectCoupon: async (userId, couponId) => {
    const user = await User.findById(userId).populate("loyalty.tier");
    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      throw new ApiError(404, "Không tìm thấy mã giảm giá");
    }

    // Kiểm tra coupon có công khai HOẶC có thể đổi bằng điểm
    // Coupon đổi điểm (isRedeemable=true) không cần phải public
    if (!coupon.isPublic && !coupon.isRedeemable) {
      throw new ApiError(403, "Mã giảm giá không công khai");
    }

    // Kiểm tra trạng thái
    if (coupon.status !== "active") {
      throw new ApiError(422, "Mã giảm giá không còn hoạt động");
    }

    // Kiểm tra thời gian
    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
      throw new ApiError(422, "Mã giảm giá không trong thời gian sử dụng");
    }

    // Validate advanced conditions (required tiers, first order, etc.)
    if (coupon.conditions) {
      // Check required tiers
      if (coupon.conditions.requiredTiers?.length > 0) {
        if (!user.loyalty?.tier) {
          throw new ApiError(
            403,
            "Mã giảm giá này chỉ dành cho thành viên có hạng thành viên"
          );
        }
        const userTierId =
          user.loyalty.tier._id?.toString() || user.loyalty.tier.toString();
        const isValidTier = coupon.conditions.requiredTiers.some(
          (t) => t.toString() === userTierId
        );
        if (!isValidTier) {
          throw new ApiError(
            403,
            "Hạng thành viên của bạn không đủ điều kiện để thu thập coupon này"
          );
        }
      }

      // Check first order only
      // FIXED Bug #13: Thay 'shipping' thành 'out_for_delivery' để match Order schema
      if (coupon.conditions.firstOrderOnly) {
        const orderCount = await Order.countDocuments({
          user: userId,
          status: { $in: ["delivered", "confirmed", "out_for_delivery"] },
        });
        if (orderCount > 0) {
          throw new ApiError(
            403,
            "Mã giảm giá này chỉ dành cho đơn hàng đầu tiên"
          );
        }
      }

      // Check required total spent
      if (coupon.conditions.requiredTotalSpent) {
        const totalSpent = await Order.aggregate([
          {
            $match: {
              user: new mongoose.Types.ObjectId(userId),
              status: "delivered",
              deletedAt: null,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalAfterDiscountAndShipping" },
            },
          },
        ]);
        const userTotalSpent = totalSpent.length > 0 ? totalSpent[0].total : 0;
        if (userTotalSpent < coupon.conditions.requiredTotalSpent) {
          throw new ApiError(
            403,
            `Cần chi tiêu tối thiểu ${coupon.conditions.requiredTotalSpent.toLocaleString(
              "vi-VN"
            )}đ để thu thập coupon này`
          );
        }
      }
    }

    // ============================================================
    // CHECK USER ĐÃ COLLECT COUPON CHƯA - PHẢI CHECK TRƯỚC KHI TRỪ ĐIỂM
    // ============================================================
    // FIXED: Di chuyển logic check user đã collect lên trước khi trừ điểm
    const alreadyCollected = coupon.users.some(
      (u) => u.toString() === userId.toString()
    );
    if (alreadyCollected) {
      throw new ApiError(422, "Bạn đã thu thập mã giảm giá này rồi");
    }

    // ============================================================
    // XỬ LÝ ĐỔI ĐIỂM (NẾU COUPON CÓ THỂ REDEEM) VỚI TRANSACTION
    // ============================================================
    let pointsUsed = 0;
    const session = await mongoose.startSession();

    try {
      await session.startTransaction();

      if (coupon.isRedeemable && coupon.pointCost > 0) {
        // Kiểm tra user có đủ điểm không
        const currentPoints = user.loyalty?.points || 0;

        if (currentPoints < coupon.pointCost) {
          throw new ApiError(
            400,
            `Không đủ điểm. Cần ${coupon.pointCost} điểm, bạn có ${currentPoints} điểm`
          );
        }

        // Kiểm tra giới hạn đổi/user (nếu có)
        if (coupon.maxRedeemPerUser) {
          const userUsageEntry = coupon.userUsage?.find(
            (u) => u.user?.toString() === userId.toString()
          );
          const userRedeemCount = userUsageEntry?.usageCount || 0;

          if (userRedeemCount >= coupon.maxRedeemPerUser) {
            throw new ApiError(
              422,
              `Bạn đã đổi coupon này ${userRedeemCount}/${coupon.maxRedeemPerUser} lần`
            );
          }
        }

        // Trừ điểm (trong transaction) - CHỈ KHI ĐÃ CHECK USER CHƯA COLLECT
        const loyaltyService = require("@services/loyalty.service");
        await loyaltyService.deductPoints(userId, coupon.pointCost, {
          type: "REDEEM",
          source: "MANUAL",
          description: `Đổi ${coupon.pointCost} điểm lấy coupon ${coupon.code}`,
        });

        pointsUsed = coupon.pointCost;
      }

      // FIXED Bug #17: ATOMIC UPDATE - Thêm user vào danh sách với $addToSet (tránh race condition)
      const updatedCoupon = await Coupon.findOneAndUpdate(
        { _id: coupon._id },
        { $addToSet: { users: userId } },
        { new: true, session }
      );

      await session.commitTransaction();
      coupon.users = updatedCoupon.users; // Update local object
    } catch (error) {
      // Chỉ abort transaction nếu transaction đang active
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      session.endSession();
    }

    return {
      success: true,
      message: coupon.isRedeemable
        ? `Đã đổi ${pointsUsed} điểm lấy coupon thành công`
        : "Thu thập mã giảm giá thành công",
      pointsUsed,
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        maxDiscount: coupon.maxDiscount,
        minOrderValue: coupon.minOrderValue,
        startDate: coupon.startDate,
        endDate: coupon.endDate,
        isRedeemable: coupon.isRedeemable,
        pointCost: coupon.pointCost,
      },
    };
  },

  /**
   * Lấy chi tiết mã giảm giá
   * @param {String} userId - ID của người dùng
   * @param {String} couponId - ID của mã giảm giá
   * @returns {Object} - Chi tiết mã giảm giá
   */
  getCouponDetails: async (userId, couponId) => {
    // Kiểm tra coupon tồn tại
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      throw new ApiError(404, "Không tìm thấy mã giảm giá");
    }

    // Kiểm tra người dùng đã thu thập coupon này chưa
    if (!coupon.users.includes(userId)) {
      throw new ApiError(403, "Bạn chưa thu thập mã giảm giá này");
    }

    // Kiểm tra trạng thái coupon
    const now = new Date();
    const isValid =
      coupon.status === "active" &&
      now >= new Date(coupon.startDate) &&
      now <= new Date(coupon.endDate) &&
      (!coupon.maxUses || coupon.currentUses < coupon.maxUses);

    // Trả về thông tin chi tiết
    return {
      success: true,
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        maxDiscount: coupon.maxDiscount,
        minOrderValue: coupon.minOrderValue,
        startDate: coupon.startDate,
        endDate: coupon.endDate,
        status: coupon.status,
        isValid,
      },
    };
  },

  /**
   * Validate coupon với advanced conditions
   * @param {Object} coupon - Coupon object
   * @param {String} userId - User ID
   * @param {Array} cartItems - Cart items array
   * @returns {Object} - Validation result
   */
  validateAdvancedCoupon: async (coupon, userId, cartItems = []) => {
    // 1. Check scope - Kiểm tra coupon áp dụng cho sản phẩm/variant/category nào
    if (coupon.scope && coupon.scope !== "ALL") {
      let hasApplicableItem = false;

      for (const item of cartItems) {
        // Lấy productId từ cart item - hỗ trợ cả dạng populated và non-populated
        const itemProductId =
          item.variant?.product?._id?.toString() ||
          item.variant?.product?.toString() ||
          null;

        // Check applicable products
        if (
          coupon.scope === "PRODUCTS" &&
          coupon.applicableProducts?.length > 0
        ) {
          if (itemProductId) {
            // FIXED: Hỗ trợ cả trường hợp applicableProducts được populate và không được populate
            const isApplicable = coupon.applicableProducts.some((p) => {
              // Nếu p là object (đã populate), lấy _id
              const productId = p._id?.toString() || p.toString();
              return productId === itemProductId;
            });

            if (isApplicable) {
              hasApplicableItem = true;
              break;
            }
          }
        }

        // Check applicable categories
        if (
          coupon.scope === "CATEGORIES" &&
          coupon.applicableCategories?.length > 0
        ) {
          // Lấy categoryId từ cart item - hỗ trợ cả dạng populated và non-populated
          const itemCategoryId =
            item.variant?.product?.category?._id?.toString() ||
            item.variant?.product?.category?.toString() ||
            null;

          if (itemCategoryId) {
            // FIXED: Hỗ trợ cả trường hợp applicableCategories được populate và không được populate
            const isApplicable = coupon.applicableCategories.some((c) => {
              const categoryId = c._id?.toString() || c.toString();
              return categoryId === itemCategoryId;
            });

            if (isApplicable) {
              hasApplicableItem = true;
              break;
            }
          }
        }
      }

      if (!hasApplicableItem) {
        return {
          isValid: false,
          message: "Mã giảm giá không áp dụng cho sản phẩm trong giỏ hàng",
        };
      }
    }

    // 2. Check conditions
    if (coupon.conditions) {
      const conditions = coupon.conditions;

      // Check minQuantity
      if (conditions.minQuantity) {
        const totalQuantity = cartItems.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
        if (totalQuantity < conditions.minQuantity) {
          return {
            isValid: false,
            message: `Cần mua tối thiểu ${conditions.minQuantity} sản phẩm để áp dụng mã này`,
          };
        }
      }

      // Check maxUsagePerUser
      if (conditions.maxUsagePerUser) {
        const usageCount =
          coupon.userUsage?.find(
            (u) => u.user?.toString() === userId?.toString()
          )?.usageCount || 0;
        if (usageCount >= conditions.maxUsagePerUser) {
          return {
            isValid: false,
            message: `Bạn đã sử dụng mã này ${usageCount}/${conditions.maxUsagePerUser} lần`,
          };
        }
      }

      // Check requiredTiers (loyalty tiers)
      if (conditions.requiredTiers && conditions.requiredTiers.length > 0) {
        const user = await User.findById(userId).populate("loyalty.tier");
        if (!user) {
          return {
            isValid: false,
            message: "Không tìm thấy người dùng",
          };
        }

        if (!user.loyalty?.tier) {
          return {
            isValid: false,
            message:
              "Mã giảm giá này chỉ dành cho thành viên có hạng thành viên",
          };
        }

        const userTierId =
          user.loyalty.tier._id?.toString() || user.loyalty.tier.toString();
        const isValidTier = conditions.requiredTiers.some(
          (t) => t.toString() === userTierId
        );
        if (!isValidTier) {
          return {
            isValid: false,
            message:
              "Hạng thành viên của bạn không đủ điều kiện sử dụng mã giảm giá này",
          };
        }
      }

      // Check firstOrderOnly
      // FIXED Bug #13: Thay 'shipping' thành 'out_for_delivery' để match Order schema
      if (conditions.firstOrderOnly) {
        const orderCount = await Order.countDocuments({
          user: userId,
          status: { $in: ["delivered", "confirmed", "out_for_delivery"] },
        });
        if (orderCount > 0) {
          return {
            isValid: false,
            message: "Mã giảm giá này chỉ dành cho đơn hàng đầu tiên",
          };
        }
      }
    }

    return {
      isValid: true,
      message: "Mã giảm giá hợp lệ",
    };
  },

  /**
   * Calculate applicable discount for items based on coupon scope
   * @param {Object} coupon - Coupon object
   * @param {Array} cartItems - Cart items array
   * @param {Number} subtotal - Original subtotal
   * @returns {Object} - Discount info
   */
  calculateApplicableDiscount: (coupon, cartItems, subtotal) => {
    let applicableSubtotal = subtotal;

    // If coupon has scope restriction, only apply to applicable items
    if (coupon.scope && coupon.scope !== "ALL") {
      applicableSubtotal = 0;

      for (const item of cartItems) {
        let isApplicable = false;

        // Lấy productId từ cart item - hỗ trợ cả dạng populated và non-populated
        const itemProductId =
          item.variant?.product?._id?.toString() ||
          item.variant?.product?.toString() ||
          null;

        if (
          coupon.scope === "PRODUCTS" &&
          coupon.applicableProducts?.length > 0
        ) {
          if (itemProductId) {
            // FIXED: Hỗ trợ cả trường hợp applicableProducts được populate và không được populate
            isApplicable = coupon.applicableProducts.some((p) => {
              const productId = p._id?.toString() || p.toString();
              return productId === itemProductId;
            });
          }
        } else if (
          coupon.scope === "CATEGORIES" &&
          coupon.applicableCategories?.length > 0
        ) {
          // Lấy categoryId từ cart item - hỗ trợ cả dạng populated và non-populated
          const itemCategoryId =
            item.variant?.product?.category?._id?.toString() ||
            item.variant?.product?.category?.toString() ||
            null;

          if (itemCategoryId) {
            // FIXED: Hỗ trợ cả trường hợp applicableCategories được populate và không được populate
            isApplicable = coupon.applicableCategories.some((c) => {
              const categoryId = c._id?.toString() || c.toString();
              return categoryId === itemCategoryId;
            });
          }
        }

        if (isApplicable) {
          applicableSubtotal += item.price * item.quantity;
        }
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === "percent") {
      discountAmount = (applicableSubtotal * coupon.value) / 100;
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else if (coupon.type === "fixed") {
      discountAmount = Math.min(coupon.value, applicableSubtotal);
    }

    return {
      applicableSubtotal,
      discountAmount: Math.round(discountAmount),
    };
  },

  /**
   * Xác thực mã giảm giá theo code
   * @param {String} userId - ID của người dùng
   * @param {String} code - Mã giảm giá
   * @param {Number} subTotal - Tổng tiền đơn hàng
   * @returns {Object} - Kết quả xác thực và thông tin discount
   */
  verifyCouponByCode: async (userId, code, subTotal = 0) => {
    // Tìm coupon theo code
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
    });

    if (!coupon) {
      return {
        isValid: false,
        message: "Mã giảm giá không tồn tại",
      };
    }

    // Kiểm tra trạng thái coupon
    if (coupon.status !== "active") {
      return {
        isValid: false,
        message: "Mã giảm giá không còn hoạt động",
      };
    }

    // Kiểm tra thời gian hiệu lực
    const now = new Date();
    if (now < new Date(coupon.startDate)) {
      return {
        isValid: false,
        message: "Mã giảm giá chưa có hiệu lực",
      };
    }

    if (now > new Date(coupon.endDate)) {
      return {
        isValid: false,
        message: "Mã giảm giá đã hết hạn",
      };
    }

    // Kiểm tra số lượng sử dụng tối đa
    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      return {
        isValid: false,
        message: "Mã giảm giá đã hết lượt sử dụng",
      };
    }

    // Kiểm tra người dùng đã thu thập coupon chưa (nếu coupon không public)
    if (!coupon.isPublic && !coupon.users.includes(userId)) {
      return {
        isValid: false,
        message: "Bạn chưa thu thập mã giảm giá này",
      };
    }

    // Kiểm tra giá trị đơn hàng tối thiểu
    if (coupon.minOrderValue && subTotal < coupon.minOrderValue) {
      return {
        isValid: false,
        message: `Đơn hàng cần tối thiểu ${coupon.minOrderValue.toLocaleString(
          "vi-VN"
        )}đ để áp dụng mã này`,
      };
    }

    // Kiểm tra số lần sử dụng của user
    if (coupon.conditions?.maxUsagePerUser) {
      const usageCount =
        coupon.userUsage?.find((u) => u.user?.toString() === userId?.toString())
          ?.usageCount || 0;
      if (usageCount >= coupon.conditions.maxUsagePerUser) {
        return {
          isValid: false,
          message: `Bạn đã sử dụng mã này ${usageCount}/${coupon.conditions.maxUsagePerUser} lần`,
        };
      }
    }

    // Tính toán discount
    let discountAmount = 0;
    if (coupon.type === "percent") {
      discountAmount = (subTotal * coupon.value) / 100;
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else if (coupon.type === "fixed") {
      discountAmount = Math.min(coupon.value, subTotal);
    }

    return {
      isValid: true,
      message: "Mã giảm giá hợp lệ",
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        maxDiscount: coupon.maxDiscount,
        minOrderValue: coupon.minOrderValue,
        startDate: coupon.startDate,
        endDate: coupon.endDate,
      },
      discount: Math.round(discountAmount),
    };
  },
};

/**
 * ADMIN COUPON SERVICE - Quản lý mã giảm giá
 */
const adminCouponService = {
  /**
   * Lấy danh sách tất cả mã giảm giá
   * @param {Object} query - Các tham số truy vấn và phân trang
   * @returns {Object} - Danh sách mã giảm giá phân trang
   */
  getAllCoupons: async (query = {}) => {
    const {
      page = 1,
      limit = 10,
      code,
      search,
      type,
      status,
      isPublic,
      isRedeemable,
      scope,
    } = query;

    // Xây dựng điều kiện lọc
    const filter = {};

    // Search by code or description
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    } else if (code) {
      filter.code = { $regex: code, $options: "i" };
    }

    if (type && ["percent", "fixed"].includes(type)) {
      filter.type = type;
    }

    if (
      status &&
      ["active", "inactive", "expired", "archived"].includes(status)
    ) {
      filter.status = status;
    }

    if (isPublic !== undefined) {
      filter.isPublic = isPublic === "true" || isPublic === true;
    }

    // Filter by isRedeemable
    if (isRedeemable !== undefined) {
      filter.isRedeemable = isRedeemable === "true" || isRedeemable === true;
    }

    // Filter by scope
    if (scope && ["ALL", "PRODUCTS", "CATEGORIES"].includes(scope)) {
      filter.scope = scope;
    }

    // FIXED Bug #32: Dùng aggregate với priorityValue mapping
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [countResult, coupons] = await Promise.all([
      Coupon.countDocuments(filter),
      Coupon.aggregate([
        { $match: filter },
        {
          $addFields: {
            priorityValue: {
              $switch: {
                branches: [
                  { case: { $eq: ["$priority", "HIGH"] }, then: 3 },
                  { case: { $eq: ["$priority", "MEDIUM"] }, then: 2 },
                  { case: { $eq: ["$priority", "LOW"] }, then: 1 },
                ],
                default: 0,
              },
            },
          },
        },
        { $sort: { priorityValue: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limitNum },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdBy",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "updatedBy",
            foreignField: "_id",
            as: "updatedBy",
          },
        },
        {
          $addFields: {
            createdBy: { $arrayElemAt: ["$createdBy", 0] },
            updatedBy: { $arrayElemAt: ["$updatedBy", 0] },
          },
        },
        {
          $project: {
            __v: 0,
            priorityValue: 0,
            "createdBy.password": 0,
            "createdBy.loyalty": 0,
            "updatedBy.password": 0,
            "updatedBy.loyalty": 0,
          },
        },
      ]),
    ]);

    const totalPages = Math.ceil(countResult / limitNum);

    return {
      success: true,
      count: coupons.length,
      total: countResult,
      totalPages,
      currentPage: pageNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
      data: coupons,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult,
        totalPages,
      },
    };
  },

  /**
   * Lấy chi tiết mã giảm giá
   * @param {String} couponId - ID của mã giảm giá
   * @returns {Object} - Chi tiết mã giảm giá
   */
  getCouponById: async (couponId) => {
    const coupon = await Coupon.findById(couponId)
      .populate({ path: "createdBy", select: "name email" })
      .populate({ path: "updatedBy", select: "name email" })
      .populate({ path: "applicableProducts", select: "name slug" })
      .populate({ path: "applicableCategories", select: "name slug" })
      .populate({
        path: "conditions.requiredTiers",
        select: "name displayOrder",
      })
      .populate({ path: "users", select: "name email" });

    if (!coupon) {
      throw new ApiError(404, "Không tìm thấy mã giảm giá");
    }

    return {
      success: true,
      data: coupon,
      coupon,
    };
  },

  /**
   * Tạo mã giảm giá mới
   * @param {Object} couponData - Dữ liệu mã giảm giá
   * @param {String} adminId - ID của admin tạo
   * @returns {Object} - Mã giảm giá đã tạo
   */
  createCoupon: async (couponData, adminId) => {
    // Kiểm tra các ràng buộc dựa trên loại giảm giá
    if (couponData.type === "percent") {
      if (couponData.value < 0 || couponData.value > 100) {
        throw new ApiError(400, "Giá trị phần trăm giảm giá phải từ 0 đến 100");
      }
    }

    // Kiểm tra logic redeem
    if (couponData.isRedeemable) {
      if (!couponData.pointCost || couponData.pointCost <= 0) {
        throw new ApiError(400, "Coupon có thể đổi phải có pointCost > 0");
      }
    }

    // CRITICAL FIX Bug #8: Validate scope applicability
    if (couponData.scope && couponData.scope !== "ALL") {
      if (couponData.scope === "PRODUCTS") {
        if (
          !couponData.applicableProducts ||
          couponData.applicableProducts.length === 0
        ) {
          throw new ApiError(
            400,
            "Coupon với scope PRODUCTS phải chọn ít nhất 1 sản phẩm"
          );
        }
      } else if (couponData.scope === "CATEGORIES") {
        if (
          !couponData.applicableCategories ||
          couponData.applicableCategories.length === 0
        ) {
          throw new ApiError(
            400,
            "Coupon với scope CATEGORIES phải chọn ít nhất 1 danh mục"
          );
        }
      }
    }

    // Kiểm tra mã đã tồn tại chưa
    const existingCoupon = await Coupon.findOne({
      code: couponData.code.toUpperCase(),
    });
    if (existingCoupon) {
      throw new ApiError(400, "Mã giảm giá đã tồn tại");
    }

    // Đảm bảo code luôn viết hoa
    couponData.code = couponData.code.toUpperCase();

    // Thêm thông tin người tạo
    couponData.createdBy = adminId;
    couponData.updatedBy = adminId;

    // Tạo mã giảm giá mới
    const coupon = new Coupon(couponData);
    await coupon.save();

    return {
      success: true,
      message: "Tạo mã giảm giá thành công",
      coupon,
    };
  },

  /**
   * Cập nhật mã giảm giá
   * @param {String} couponId - ID của mã giảm giá
   * @param {Object} couponData - Dữ liệu cập nhật
   * @param {String} adminId - ID của admin
   * @returns {Object} - Mã giảm giá đã cập nhật
   */
  updateCoupon: async (couponId, couponData, adminId) => {
    // Kiểm tra mã giảm giá tồn tại
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      throw new ApiError(404, "Không tìm thấy mã giảm giá");
    }

    // CRITICAL FIX Bug #8: Validate scope applicability
    const finalScope =
      couponData.scope !== undefined ? couponData.scope : coupon.scope;
    if (finalScope && finalScope !== "ALL") {
      if (finalScope === "PRODUCTS") {
        const products =
          couponData.applicableProducts !== undefined
            ? couponData.applicableProducts
            : coupon.applicableProducts;
        if (!products || products.length === 0) {
          throw new ApiError(
            400,
            "Coupon với scope PRODUCTS phải chọn ít nhất 1 sản phẩm"
          );
        }
      } else if (finalScope === "CATEGORIES") {
        const categories =
          couponData.applicableCategories !== undefined
            ? couponData.applicableCategories
            : coupon.applicableCategories;
        if (!categories || categories.length === 0) {
          throw new ApiError(
            400,
            "Coupon với scope CATEGORIES phải chọn ít nhất 1 danh mục"
          );
        }
      }
    }

    // Kiểm tra loại giảm giá nếu được cung cấp
    if (couponData.type !== undefined) {
      // Kiểm tra các ràng buộc dựa trên loại giảm giá
      if (couponData.type === "percent") {
        const value =
          couponData.value !== undefined ? couponData.value : coupon.value;
        if (value < 0 || value > 100) {
          throw new ApiError(
            400,
            "Giá trị phần trăm giảm giá phải từ 0 đến 100"
          );
        }
      }
    }

    // Kiểm tra logic redeem khi update
    if (couponData.isRedeemable !== undefined) {
      const isRedeemable = couponData.isRedeemable;
      const pointCost =
        couponData.pointCost !== undefined
          ? couponData.pointCost
          : coupon.pointCost;

      if (isRedeemable && (!pointCost || pointCost <= 0)) {
        throw new ApiError(400, "Coupon có thể đổi phải có pointCost > 0");
      }
    }

    // Nếu thay đổi code, kiểm tra trùng lặp
    if (couponData.code && couponData.code !== coupon.code) {
      const existingCoupon = await Coupon.findOne({
        code: couponData.code.toUpperCase(),
        _id: { $ne: couponId },
      });

      if (existingCoupon) {
        throw new ApiError(400, "Mã giảm giá đã tồn tại");
      }

      // Đảm bảo code luôn viết hoa
      couponData.code = couponData.code.toUpperCase();
    }

    // Cập nhật thời gian
    couponData.updatedAt = new Date();

    // Thêm thông tin người cập nhật
    couponData.updatedBy = adminId;

    // Cập nhật mã giảm giá
    const updatedCoupon = await Coupon.findByIdAndUpdate(
      couponId,
      { $set: couponData },
      { new: true, runValidators: true }
    );

    return {
      success: true,
      message: "Cập nhật mã giảm giá thành công",
      coupon: updatedCoupon,
    };
  },

  /**
   * Xóa mã giảm giá
   * @param {String} couponId - ID của mã giảm giá
   * @returns {Object} - Kết quả xóa
   */
  deleteCoupon: async (couponId) => {
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      throw new ApiError(404, "Không tìm thấy mã giảm giá");
    }

    // Middleware sẽ tự động chuyển sang archived nếu coupon đã được sử dụng
    try {
      await coupon.deleteOne();
      return {
        success: true,
        message: "Xóa mã giảm giá thành công",
      };
    } catch (error) {
      // Nếu lỗi từ middleware và đã chuyển thành archived
      if (error.message.includes("archived")) {
        return {
          success: true,
          message: error.message,
        };
      }
      throw error;
    }
  },

  /**
   * Cập nhật trạng thái mã giảm giá
   * @param {String} couponId - ID của mã giảm giá
   * @param {String} status - Trạng thái mới
   * @param {String} adminId - ID của admin
   * @returns {Object} - Kết quả cập nhật
   */
  updateCouponStatus: async (couponId, status, adminId) => {
    if (!["active", "inactive", "archived"].includes(status)) {
      throw new ApiError(400, "Trạng thái không hợp lệ");
    }

    const coupon = await Coupon.findByIdAndUpdate(
      couponId,
      {
        $set: {
          status,
          updatedBy: adminId,
        },
      },
      { new: true }
    );

    if (!coupon) {
      throw new ApiError(404, "Không tìm thấy mã giảm giá");
    }

    return {
      success: true,
      message: `Đã chuyển trạng thái mã giảm giá thành ${status}`,
      coupon,
    };
  },
};

// Kết hợp services để export
const exportedCouponService = {
  ...couponService,
  adminCouponService,
};

module.exports = exportedCouponService;
