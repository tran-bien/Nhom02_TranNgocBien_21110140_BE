const mongoose = require("mongoose");
const { createSlug } = require("@utils/slugify");

/**
 * Cập nhật thông tin tồn kho của sản phẩm
 * ĐỌC TỪ INVENTORYITEM THAY VÌ VARIANT
 * @param {Object|String} product Đối tượng sản phẩm hoặc ID sản phẩm
 */
const updateProductStockInfo = async (product) => {
  try {
    const Product = mongoose.model("Product");
    const InventoryItem = mongoose.model("InventoryItem");

    // Kiểm tra nếu là ID thì lấy sản phẩm
    const productId =
      typeof product === "string" || product instanceof mongoose.Types.ObjectId
        ? product
        : product._id;

    // ĐỌC TỪ INVENTORYITEM - SOURCE OF TRUTH
    const inventoryItems = await InventoryItem.find({
      product: productId,
    }).select("quantity");

    // Tính tổng số lượng từ tất cả InventoryItems
    let totalQuantity = 0;

    inventoryItems.forEach((item) => {
      totalQuantity += item.quantity || 0;
    });

    // Xác định trạng thái tồn kho
    let stockStatus = "out_of_stock";
    if (totalQuantity > 0) {
      stockStatus = totalQuantity < 5 ? "low_stock" : "in_stock";
    }

    // Cập nhật sản phẩm
    await Product.findByIdAndUpdate(productId, {
      $set: {
        totalQuantity,
        stockStatus,
      },
    });

    console.log(
      `[ProductStockInfo] Cập nhật thành công: ${productId}, Số lượng: ${totalQuantity}, Trạng thái: ${stockStatus}`
    );

    return { totalQuantity, stockStatus };
  } catch (error) {
    console.error("[UpdateProductStockInfo] Lỗi:", error);
    throw error;
  }
};

/**
 * Áp dụng middleware cho Product Schema
 * @param {mongoose.Schema} schema - Schema để áp dụng middleware
 */
const applyMiddlewares = (schema) => {
  // REMOVED: Middleware cũ update stock từ variants
  // Stock giờ được update từ inventory.service.js khi stock in/out
  // Product middleware không còn tự động update stock nữa

  // Tạo slug trước khi lưu, đồng thời đảm bảo tính duy nhất
  schema.pre("save", async function (next) {
    try {
      if (this.isModified("name") || !this.slug) {
        this.slug = createSlug(this.name);

        // Đảm bảo slug là duy nhất (kiểm tra cả sản phẩm đã xóa mềm)
        const Product = mongoose.model("Product");
        const slugRegEx = new RegExp(`^${this.slug}(-\\d+)?$`, "i");

        // Tìm tất cả các sản phẩm có slug tương tự (kể cả đã xóa mềm)
        const productsWithSlug = await Product.find({
          slug: slugRegEx,
          _id: { $ne: this._id },
        }).setOptions({ includeDeleted: true });

        if (productsWithSlug.length > 0) {
          // Thêm timestamp để đảm bảo duy nhất
          this.slug = `${this.slug}-${Date.now()}`;
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  });

  // Xử lý khi khôi phục sản phẩm (đặt deletedAt thành null)
  schema.pre("findOneAndUpdate", async function (next) {
    try {
      const update = this.getUpdate();

      // Nếu đang khôi phục (đặt deletedAt thành null)
      if (update && update.$set && update.$set.deletedAt === null) {
        const doc = await this.model.findOne(this.getFilter(), {
          includeDeleted: true,
        });

        if (doc && doc.slug) {
          // Kiểm tra xem có sản phẩm nào khác đang dùng slug này không
          const duplicate = await this.model.findOne({
            slug: doc.slug,
            _id: { $ne: doc._id },
            deletedAt: null,
          });

          if (duplicate) {
            // Nếu có, tạo một slug mới với hậu tố thời gian
            const newSlug = `${doc.slug}-${Date.now()}`;
            update.$set.slug = newSlug;
            console.log(
              `Slug bị trùng khi khôi phục, đã tạo slug mới: ${newSlug}`
            );
          }
        }

        // Kiểm tra và cập nhật status khi khôi phục
        if (update.$set.isActive === undefined) {
          update.$set.isActive = false; // Mặc định là inactive khi khôi phục
        }
      }
      next();
    } catch (error) {
      console.error("Lỗi khi kiểm tra slug khi khôi phục:", error);
      next(error);
    }
  });
};

module.exports = {
  applyMiddlewares,
  updateProductStockInfo,
};
