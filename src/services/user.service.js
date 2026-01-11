const { User, Product, Variant, Coupon } = require("@models");
const mongoose = require("mongoose");
const paginate = require("@utils/pagination");
const couponService = require("@services/coupon.service");
const ApiError = require("@utils/ApiError");

const userService = {
  /**
   * Lấy thông tin người dùng theo ID
   * @param {String} userId - ID của người dùng
   * @returns {Object} - Thông tin người dùng
   */
  getUserProfile: async (userId) => {
    const user = await User.findById(userId).select(
      "-password -otp -resetPasswordToken -resetPasswordExpire"
    );

    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    return { success: true, user };
  },

  /**
   * Cập nhật thông tin cá nhân của người dùng
   * @param {String} userId - ID của người dùng
   * @param {Object} userData - Dữ liệu cập nhật
   * @returns {Object} - Thông tin người dùng đã cập nhật
   */
  updateUserProfile: async (userId, userData) => {
    // Kiểm tra người dùng tồn tại
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    // Các trường có thể cập nhật
    const allowedFields = ["name", "phone", "gender", "dateOfBirth"];

    // Lọc dữ liệu cập nhật
    const updateData = {};
    allowedFields.forEach((field) => {
      if (userData[field] !== undefined) {
        updateData[field] = userData[field];
      }
    });

    // Cập nhật người dùng
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password -otp -resetPasswordToken -resetPasswordExpire");

    return {
      success: true,
      message: "Cập nhật thông tin cá nhân thành công",
      user: updatedUser,
    };
  },

  /**
   * === QUẢN LÝ ĐỊA CHỈ ===
   */

  /**
   * Lấy danh sách địa chỉ của người dùng
   * @param {String} userId - ID của người dùng
   * @returns {Array} - Danh sách địa chỉ
   */
  getUserAddresses: async (userId) => {
    const user = await User.findById(userId).select("addresses");

    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    return {
      success: true,
      addresses: user.addresses || [],
    };
  },

  /**
   * Thêm địa chỉ mới cho người dùng
   * @param {String} userId - ID của người dùng
   * @param {Object} addressData - Thông tin địa chỉ mới
   * @returns {Object} - Thông tin địa chỉ đã thêm
   */
  addUserAddress: async (userId, addressData) => {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    // Nếu thêm địa chỉ đầu tiên hoặc đánh dấu là mặc định
    if (user.addresses.length === 0 || addressData.isDefault) {
      // Nếu đánh dấu là mặc định, đặt tất cả các địa chỉ khác thành không mặc định
      if (user.addresses.length > 0 && addressData.isDefault) {
        user.addresses.forEach((addr) => {
          addr.isDefault = false;
        });
      }

      // Đảm bảo địa chỉ đầu tiên luôn là mặc định
      if (user.addresses.length === 0) {
        addressData.isDefault = true;
      }
    }

    // Thêm địa chỉ mới
    user.addresses.push(addressData);
    await user.save();

    // Lấy địa chỉ vừa thêm
    const newAddress = user.addresses[user.addresses.length - 1];

    return {
      success: true,
      message: "Thêm địa chỉ thành công",
      address: newAddress,
    };
  },

  /**
   * Cập nhật địa chỉ của người dùng
   * @param {String} userId - ID của người dùng
   * @param {String} addressId - ID của địa chỉ
   * @param {Object} addressData - Dữ liệu cập nhật
   * @returns {Object} - Thông tin địa chỉ đã cập nhật
   */
  updateUserAddress: async (userId, addressId, addressData) => {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    // Tìm vị trí của địa chỉ cần cập nhật
    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id.toString() === addressId
    );

    if (addressIndex === -1) {
      throw new ApiError(404, "Không tìm thấy địa chỉ");
    }

    // Nếu đặt làm mặc định, đặt tất cả các địa chỉ khác thành không mặc định
    if (addressData.isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    // Cập nhật địa chỉ
    const existingAddress = user.addresses[addressIndex];
    const fields = [
      "name",
      "phone",
      "province",
      "district",
      "ward",
      "detail",
      "isDefault",
    ];

    fields.forEach((field) => {
      if (addressData[field] !== undefined) {
        existingAddress[field] = addressData[field];
      }
    });

    // Middleware sẽ đảm bảo chỉ có một địa chỉ mặc định
    await user.save();

    return {
      success: true,
      message: "Cập nhật địa chỉ thành công",
      address: user.addresses[addressIndex],
    };
  },

  /**
   * Xóa địa chỉ của người dùng
   * @param {String} userId - ID của người dùng
   * @param {String} addressId - ID của địa chỉ
   * @returns {Object} - Kết quả xóa địa chỉ
   */
  deleteUserAddress: async (userId, addressId) => {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    // Tìm vị trí của địa chỉ cần xóa
    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id.toString() === addressId
    );

    if (addressIndex === -1) {
      throw new ApiError(404, "Không tìm thấy địa chỉ");
    }

    // Kiểm tra nếu đây là địa chỉ mặc định và có địa chỉ khác
    const isDefault = user.addresses[addressIndex].isDefault;

    // Xóa địa chỉ
    user.addresses.splice(addressIndex, 1);

    // Nếu xóa địa chỉ mặc định và còn địa chỉ khác, đặt địa chỉ đầu tiên làm mặc định
    if (isDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    return {
      success: true,
      message: "Xóa địa chỉ thành công",
    };
  },

  /**
   * Đặt địa chỉ mặc định
   * @param {String} userId - ID của người dùng
   * @param {String} addressId - ID của địa chỉ
   * @returns {Object} - Kết quả đặt địa chỉ mặc định
   */
  setDefaultAddress: async (userId, addressId) => {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    // Đặt tất cả các địa chỉ thành không mặc định
    user.addresses.forEach((addr) => {
      addr.isDefault = addr._id.toString() === addressId;
    });

    // Kiểm tra xem có địa chỉ nào được đặt làm mặc định không
    const addressExists = user.addresses.some(
      (addr) => addr._id.toString() === addressId
    );

    if (!addressExists) {
      throw new ApiError(404, "Không tìm thấy địa chỉ");
    }

    await user.save();

    return {
      success: true,
      message: "Đặt địa chỉ mặc định thành công",
    };
  },

  /**
   * === QUẢN LÝ DANH SÁCH YÊU THÍCH ===
   */

  /**
   * Lấy danh sách yêu thích của người dùng
   * @param {String} userId - ID của người dùng
   * @returns {Array} - Danh sách sản phẩm yêu thích
   */
  getUserWishlist: async (userId) => {
    const user = await User.findById(userId)
      .select("wishlist")
      .populate({
        path: "wishlist.product",
        select: "name slug images category brand isActive",
        populate: [
          { path: "category", select: "name" },
          { path: "brand", select: "name" },
        ],
      })
      .populate({
        path: "wishlist.variant",
        select: "color gender imagesvariant",
        populate: { path: "color", select: "name code type colors" },
      });

    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    // Lọc các sản phẩm hoặc biến thể đã bị xóa hoặc vô hiệu hóa
    const validWishlist = user.wishlist.filter((item) => {
      return item.product && item.product.isActive;
    });

    // FIXED Bug #36: Thêm pricing từ InventoryItem cho wishlist
    const inventoryService = require("@services/inventory.service");
    const wishlistWithPricing = await Promise.all(
      validWishlist.map(async (item) => {
        const itemObj = item.toObject ? item.toObject() : { ...item };

        // Nếu có variant, lấy pricing từ InventoryItem
        if (itemObj.variant && itemObj.variant._id) {
          try {
            const pricingData = await inventoryService.getVariantPricing(
              itemObj.variant._id
            );
            itemObj.variant.price = pricingData.pricing.calculatedPrice || 0;
            itemObj.variant.priceFinal =
              pricingData.pricing.calculatedPriceFinal || 0;
            itemObj.variant.percentDiscount =
              pricingData.pricing.percentDiscount || 0;
          } catch (error) {
            // Nếu không lấy được giá, set default
            itemObj.variant.price = 0;
            itemObj.variant.priceFinal = 0;
            itemObj.variant.percentDiscount = 0;
          }
        }

        return itemObj;
      })
    );

    return {
      success: true,
      wishlist: wishlistWithPricing,
    };
  },

  /**
   * Thêm sản phẩm vào danh sách yêu thích
   * @param {String} userId - ID của người dùng
   * @param {String} productId - ID của sản phẩm
   * @param {String} variantId - ID của biến thể (không bắt buộc)
   * @returns {Object} - Kết quả thêm vào danh sách yêu thích
   */
  addToWishlist: async (userId, productId, variantId = null) => {
    // Kiểm tra người dùng
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    // Kiểm tra sản phẩm
    const product = await Product.findOne({
      _id: productId,
      isActive: true,
      deletedAt: null,
    });

    if (!product) {
      throw new ApiError(404, "Không tìm thấy sản phẩm");
    }

    // Kiểm tra biến thể nếu có
    if (variantId) {
      const variant = await Variant.findOne({
        _id: variantId,
        product: productId,
        isActive: true,
        deletedAt: null,
      });

      if (!variant) {
        throw new ApiError(404, "Không tìm thấy biến thể");
      }
    }

    // Kiểm tra xem sản phẩm đã có trong danh sách yêu thích chưa
    const existingIndex = user.wishlist.findIndex(
      (item) =>
        item.product.toString() === productId &&
        ((!variantId && !item.variant) ||
          (variantId && item.variant && item.variant.toString() === variantId))
    );

    if (existingIndex !== -1) {
      return {
        success: true,
        message: `Sản phẩm đã có trong danh sách yêu thích`,
        isExisting: true,
      };
    }

    // Thêm vào danh sách yêu thích
    const wishlistItem = {
      product: productId,
      addedAt: new Date(),
    };

    if (variantId) {
      wishlistItem.variant = variantId;
    }

    user.wishlist.push(wishlistItem);
    await user.save();

    return {
      success: true,
      message: `Đã thêm sản phẩm vào danh sách yêu thích`,
    };
  },

  /**
   * Xóa sản phẩm khỏi danh sách yêu thích
   * @param {String} userId - ID của người dùng
   * @param {String} wishlistItemId - ID của mục trong danh sách yêu thích
   * @returns {Object} - Kết quả xóa khỏi danh sách yêu thích
   */
  removeFromWishlist: async (userId, wishlistItemId) => {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    // Tìm vị trí của mục cần xóa
    const itemIndex = user.wishlist.findIndex(
      (item) => item._id.toString() === wishlistItemId
    );

    if (itemIndex === -1) {
      throw new ApiError(
        404,
        `Không tìm thấy sản phẩm trong danh sách yêu thích`
      );
    }

    // Xóa khỏi danh sách yêu thích
    user.wishlist.splice(itemIndex, 1);
    await user.save();

    return {
      success: true,
      message: `Đã xóa sản phẩm khỏi danh sách yêu thích`,
    };
  },

  /**
   * === COUPON MANAGEMENT ===
   */

  /**
   * Lấy danh sách mã giảm giá của người dùng
   * @param {String} userId - ID của người dùng
   * @returns {Object} - Danh sách mã giảm giá
   */
  getUserCoupons: async (userId) => {
    return await couponService.getUserCoupons(userId);
  },

  /**
   * Thu thập mã giảm giá
   * @param {String} userId - ID của người dùng
   * @param {String} couponCode - Mã giảm giá
   * @returns {Object} - Kết quả thu thập mã giảm giá
   */
  collectCoupon: async (userId, couponCode) => {
    return await couponService.collectCoupon(userId, couponCode);
  },

  /**
   * Lấy chi tiết mã giảm giá
   * @param {String} userId - ID của người dùng
   * @param {String} couponId - ID của mã giảm giá
   * @returns {Object} - Chi tiết mã giảm giá
   */
  getCouponDetails: async (userId, couponId) => {
    return await couponService.getCouponDetails(userId, couponId);
  },

  /**
   * Cập nhật tùy chọn thông báo của người dùng
   * @param {String} userId - ID của người dùng
   * @param {Object} preferences - Tùy chọn thông báo
   * @returns {Object} - Thông tin cập nhật
   */
  updateNotificationPreferences: async (userId, preferences) => {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    // Khởi tạo preferences nếu chưa có
    if (!user.preferences) {
      user.preferences = {
        emailNotifications: {
          orderUpdates: true,
        },
        inAppNotifications: true,
      };
    }

    // Cập nhật từng field nếu có
    if (preferences.emailNotifications) {
      if (preferences.emailNotifications.orderUpdates !== undefined) {
        user.preferences.emailNotifications.orderUpdates =
          preferences.emailNotifications.orderUpdates;
      }
    }

    if (preferences.inAppNotifications !== undefined) {
      user.preferences.inAppNotifications = preferences.inAppNotifications;
    }

    await user.save();

    return {
      success: true,
      message: "Cập nhật tùy chọn thông báo thành công",
      preferences: user.preferences,
    };
  },

  /**
   * Lấy tùy chọn thông báo hiện tại
   * @param {String} userId - ID của người dùng
   * @returns {Object} - Tùy chọn thông báo
   */
  getNotificationPreferences: async (userId) => {
    const user = await User.findById(userId).select("preferences");

    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    // Trả về preferences mặc định nếu chưa có
    const defaultPreferences = {
      emailNotifications: {
        orderUpdates: true,
      },
      inAppNotifications: true,
    };

    return {
      success: true,
      preferences: user.preferences || defaultPreferences,
    };
  },
};

/**
 * === ADMIN FUNCTIONS FOR USER MANAGEMENT ===
 */
const adminUserService = {
  /**
   * Lấy danh sách người dùng (phân trang)
   * @param {Object} query - Các tham số truy vấn
   * @returns {Object} - Danh sách người dùng phân trang
   */
  getAllUsers: async (query) => {
    const {
      page = 1,
      limit = 50,
      name,
      email,
      role,
      isActive,
      isVerified,
      isBlock,
    } = query;

    // Xây dựng điều kiện lọc
    const filter = {};

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    if (email) {
      filter.email = { $regex: email, $options: "i" };
    }

    if (role && ["user", "admin"].includes(role)) {
      filter.role = role;
    }

    // Xử lý filter trạng thái block
    if (isBlock !== undefined) {
      if (isBlock === "true" || isBlock === true) {
        filter.blockedAt = { $ne: null };
      } else if (isBlock === "false" || isBlock === false) {
        filter.blockedAt = null;
      }
    } else if (isActive !== undefined) {
      // Nếu không gửi isBlock mà gửi isActive thì vẫn filter như cũ
      filter.isActive = isActive === "true" || isActive === true;
    }

    if (isVerified !== undefined) {
      filter.isVerified = isVerified === "true" || isVerified === true;
    }

    // Xử lý sắp xếp
    let sortOptions = { createdAt: -1 };

    // Thực hiện truy vấn phân trang
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sortOptions,
      select:
        "name email phone role isActive isVerified blockedAt createdAt avatar",
    };

    return await paginate(User, filter, options);
  },

  /**
   * Lấy thông tin chi tiết của người dùng
   * @param {String} userId - ID của người dùng
   * @returns {Object} - Thông tin chi tiết người dùng
   */
  getUserDetails: async (userId) => {
    const user = await User.findById(userId)
      .select("-password -resetPasswordToken -resetPasswordExpire -otp")
      .populate(
        "coupons",
        "code name discount type minOrder maxDiscount isActive startDate endDate"
      );

    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    return { success: true, user };
  },

  /**
   * Khóa/mở khóa tài khoản người dùng
   * @param {String} userId - ID của người dùng
   * @param {Boolean} isBlock - True để khóa, false để mở khóa
   * @param {String} reason - Lý do khóa tài khoản (chỉ khi isBlock = true)
   * @returns {Object} - Kết quả khóa/mở khóa tài khoản
   */
  toggleUserBlock: async (userId, isBlock, reason = "") => {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, `Không tìm thấy người dùng với ID: ${userId}`);
    }

    // Không được phép khóa tài khoản admin
    if (user.role === "admin") {
      throw new ApiError(403, "Không thể khóa tài khoản quản trị viên");
    }

    if (isBlock) {
      // Khóa tài khoản
      user.blockedAt = new Date();
      user.blockReason = reason;
      // Middleware sẽ tự động thiết lập isActive = false
    } else {
      // Mở khóa tài khoản
      user.blockedAt = null;
      user.blockReason = null;
      // Middleware sẽ tự động thiết lập isActive = true
    }

    await user.save();

    // Vô hiệu hóa tất cả phiên đăng nhập
    const Session = mongoose.model("Session");
    await Session.updateMany(
      { user: userId, isActive: true },
      { isActive: false }
    );

    const action = isBlock ? "khóa" : "mở khóa";
    return {
      success: true,
      message: `Đã ${action} tài khoản thành công`,
    };
  },

  /**
   * Chuyển đổi role của người dùng (CHỈ ADMIN)
   * @param {String} userId - ID của người dùng cần đổi role
   * @param {String} newRole - Role mới (user, staff, shipper)
   * @param {String} adminId - ID của admin thực hiện
   * @returns {Object} - Kết quả chuyển đổi role
   */
  changeUserRole: async (userId, newRole, adminId) => {
    const validRoles = ["user", "staff", "shipper"];
    if (!validRoles.includes(newRole)) {
      throw new ApiError(
        400,
        "Role không hợp lệ. Chỉ hỗ trợ: user, staff, shipper"
      );
    }

    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "Không tìm thấy người dùng");

    if (userId === adminId) {
      throw new ApiError(403, "Không thể thay đổi role của chính mình");
    }

    // Không cho phép thay đổi role của admin
    if (user.role === "admin") {
      throw new ApiError(403, "Không thể thay đổi role của admin");
    }

    const oldRole = user.role;
    user.role = newRole;
    // Sử dụng validateModifiedOnly để tránh lỗi validation addresses
    await user.save({ validateModifiedOnly: true });

    // Các role được coi là “quản trị cao quyền”
    const highPrivilegeRoles = ["admin", "staff"];
    // Các role thấp quyền (phải đăng nhập lại nếu bị hạ xuống)
    const lowerPrivilegeRoles = ["user", "shipper"];

    // Nếu hạ từ cao xuống thấp -> khóa session
    if (
      highPrivilegeRoles.includes(oldRole) &&
      lowerPrivilegeRoles.includes(newRole)
    ) {
      const Session = mongoose.model("Session");
      await Session.updateMany(
        { user: userId, isActive: true },
        { isActive: false }
      );
    }

    return {
      success: true,
      message: `Đã chuyển role từ ${oldRole} sang ${newRole}`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  },
};

// Kết hợp services để export
const exportedUserService = {
  ...userService,
  adminUserService,
};

module.exports = exportedUserService;
