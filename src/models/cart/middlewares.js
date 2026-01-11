const mongoose = require("mongoose");
const cartSchema = require("./schema");

/**
 * Tính tổng số lượng sản phẩm trong giỏ hàng
 * @param {Array} cartItems - Danh sách sản phẩm trong giỏ hàng
 * @returns {Number} - Tổng số lượng
 */
const calculateTotalItems = (cartItems) => {
  if (!cartItems || !Array.isArray(cartItems)) return 0;
  return cartItems.reduce((total, item) => total + (item.quantity || 0), 0);
};

/**
 * Tính tổng giá trị sản phẩm trong giỏ hàng
 * @param {Array} cartItems - Danh sách sản phẩm trong giỏ hàng
 * @returns {Number} - Tổng giá trị
 */
const calculateSubTotal = (cartItems) => {
  if (!cartItems || !Array.isArray(cartItems)) return 0;
  return cartItems.reduce(
    (total, item) => total + (item.price || 0) * (item.quantity || 0),
    0
  );
};

const updateCartItemInfo = async (cartItem) => {
  try {
    // Lấy thông tin biến thể và kích thước
    const Variant = mongoose.model("Variant");
    const Size = mongoose.model("Size");
    const Product = mongoose.model("Product");
    const InventoryItem = mongoose.model("InventoryItem");

    // Xử lý ID của variant (có thể là ObjectId hoặc object đã được populate)
    const variantId =
      typeof cartItem.variant === "object"
        ? cartItem.variant._id
        : cartItem.variant;

    // Kiểm tra biến thể có tồn tại không
    const variant = await Variant.findById(variantId).select(
      "product sizes isActive"
    );

    if (!variant) {
      console.error(
        `[${new Date().toISOString()}] Không tìm thấy biến thể với ID: ${variantId}`
      );
      cartItem.isAvailable = false;
      cartItem.unavailableReason = "Không tìm thấy biến thể sản phẩm";
      return cartItem;
    }

    // Kiểm tra trạng thái biến thể
    if (variant.isActive === false) {
      console.error(
        `[${new Date().toISOString()}] Biến thể đã bị vô hiệu hóa (isActive: false)`
      );
      cartItem.isAvailable = false;
      cartItem.unavailableReason = "Biến thể sản phẩm đã bị vô hiệu hóa";
      return cartItem;
    }

    // Lấy productId từ variant
    const productId = variant.product;

    // Lấy thông tin sản phẩm
    const product = await Product.findById(productId);

    if (!product) {
      cartItem.isAvailable = false;
      cartItem.unavailableReason = "Không tìm thấy thông tin sản phẩm";
      return cartItem;
    }

    // Kiểm tra trạng thái sản phẩm
    if (product.isActive === false || product.deletedAt !== null) {
      cartItem.isAvailable = false;
      cartItem.unavailableReason = "Sản phẩm đã bị vô hiệu hóa";
      return cartItem;
    }

    // Xử lý ID của size (có thể là ObjectId hoặc object đã được populate)
    const sizeId =
      typeof cartItem.size === "object" ? cartItem.size._id : cartItem.size;

    // Kiểm tra kích cỡ tồn tại
    const size = await Size.findById(sizeId);
    if (!size) {
      cartItem.isAvailable = false;
      cartItem.unavailableReason = "Kích cỡ không tồn tại";
      return cartItem;
    }

    // Kiểm tra trong variant có size này không
    const sizeInVariant = variant.sizes.find(
      (s) => s.size && s.size.toString() === sizeId.toString()
    );

    if (!sizeInVariant) {
      cartItem.isAvailable = false;
      cartItem.unavailableReason =
        "Kích cỡ này không có sẵn trong biến thể sản phẩm";
      return cartItem;
    }

    // ============================================================
    // KIỂM TRA TỒN KHO VÀ GIÁ TỪ INVENTORYITEM (không phải Variant)
    // ============================================================
    const inventoryItem = await InventoryItem.findOne({
      product: productId,
      variant: variantId,
      size: sizeId,
    });

    if (!inventoryItem) {
      cartItem.isAvailable = false;
      cartItem.unavailableReason = "Sản phẩm hiện không có sẵn trong kho";
      return cartItem;
    }

    // FIX Bug #45: Dùng availableQuantity (quantity - reservedQuantity) thay vì quantity
    // Để hiển thị chính xác số lượng có thể đặt
    const availableQuantity =
      inventoryItem.quantity - (inventoryItem.reservedQuantity || 0);

    // Kiểm tra tồn kho đủ không
    if (availableQuantity < cartItem.quantity) {
      cartItem.isAvailable = false;
      cartItem.unavailableReason =
        availableQuantity === 0
          ? "Sản phẩm đã hết hàng"
          : `Chỉ còn ${availableQuantity} sản phẩm có thể đặt`;
      return cartItem;
    }

    // Cập nhật thông tin về sản phẩm
    cartItem.productName = product.name;
    cartItem.price =
      inventoryItem.finalPrice || inventoryItem.sellingPrice || 0;

    // Lấy hình ảnh từ biến thể hoặc sản phẩm
    let imageUrl = "";
    if (variant.imagesvariant && variant.imagesvariant.length > 0) {
      const mainImage = variant.imagesvariant.find((img) => img.isMain);
      imageUrl = mainImage ? mainImage.url : variant.imagesvariant[0].url;
    } else if (product.images && product.images.length > 0) {
      const mainImage = product.images.find((img) => img.isMain);
      imageUrl = mainImage ? mainImage.url : product.images[0].url;
    }

    cartItem.image = imageUrl;
    cartItem.isAvailable = true;
    cartItem.unavailableReason = "";

    return cartItem;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Lỗi khi cập nhật thông tin sản phẩm: ${
        error.message
      }`
    );
    cartItem.isAvailable = false;
    cartItem.unavailableReason = "Lỗi hệ thống khi xử lý thông tin sản phẩm";
    return cartItem;
  }
};

// Trong hàm applyMiddlewares
const applyMiddlewares = () => {
  // Trước khi lưu giỏ hàng
  cartSchema.pre("save", async function (next) {
    try {
      // Nếu không có sự thay đổi trong items, không cần cập nhật
      if (!this.isModified("cartItems")) {
        return next();
      }

      // Cập nhật thông tin về sản phẩm, giá, tên,...
      if (this.cartItems && this.cartItems.length > 0) {
        for (let i = 0; i < this.cartItems.length; i++) {
          this.cartItems[i] = await updateCartItemInfo(this.cartItems[i]);
        }
      }

      // Tính toán tổng số lượng và tổng giá
      this.totalItems = calculateTotalItems(this.cartItems);
      this.subTotal = calculateSubTotal(this.cartItems);

      return next();
    } catch (error) {
      if (error.stack) console.error(error.stack);
      return next(error);
    }
  });

  // Hook để kiểm tra khi cart được truy vấn
  // FIX CRITICAL: DISABLED N+1 QUERY - Việc check availability đã được xử lý trong cart.service.js
  // với batch query thay vì loop từng item
  // Nếu cần enable lại, phải refactor sang batch query pattern
  /*
  cartSchema.post("findOne", async function (doc, next) {
    if (!doc) return next();

    try {
      let needUpdate = false;

      // Kiểm tra và cập nhật thông tin sản phẩm
      if (doc.cartItems && doc.cartItems.length > 0) {
        for (let i = 0; i < doc.cartItems.length; i++) {
          const item = doc.cartItems[i];
          // Kiểm tra xem item có hợp lệ không
          if (!item || !item.variant) {
            console.error(
              `[${new Date().toISOString()}] Item không hợp lệ tại vị trí ${i}`
            );
            continue;
          }

          // Cập nhật item với thông tin mới nhất
          const updatedItem = await updateCartItemInfo(doc.cartItems[i]);

          // Kiểm tra nếu có thay đổi
          if (
            updatedItem.price !== doc.cartItems[i].price ||
            updatedItem.isAvailable !== doc.cartItems[i].isAvailable ||
            updatedItem.productName !== doc.cartItems[i].productName ||
            updatedItem.image !== doc.cartItems[i].image
          ) {
            doc.cartItems[i] = updatedItem;
            needUpdate = true;
          }
        }
      }

      // Cập nhật giỏ hàng nếu có thay đổi
      if (needUpdate) {
        doc.totalItems = calculateTotalItems(doc.cartItems);
        doc.subTotal = calculateSubTotal(doc.cartItems);

        // Tránh vòng lặp bất tận bằng cách sử dụng updateOne trực tiếp
        await mongoose.model("Cart").updateOne(
          { _id: doc._id },
          {
            $set: {
              cartItems: doc.cartItems,
              totalItems: doc.totalItems,
              subTotal: doc.subTotal,
            },
          }
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  });
  */
};

module.exports = {
  applyMiddlewares,
  calculateSubTotal, // Export để sử dụng trong cart.service.js
};
