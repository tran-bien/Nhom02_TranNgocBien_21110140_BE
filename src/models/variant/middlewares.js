const mongoose = require("mongoose");
const { generateSKU } = require("../../utils/skuGenerator");

// AUTO-GENERATE SKU trong pre-save middleware
// Sử dụng utils/skuGenerator.js cho format chuẩn: XXX-XXX-X-XXX-XXXX
// SKU được tạo tự động khi:
// 1. Tạo variant mới với sizes
// 2. Thêm size mới vào variant đã tồn tại
// 3. Khôi phục variant đã xóa (nếu SKU bị trùng)

/**
 * Cập nhật thông tin số lượng và trạng thái tồn kho của sản phẩm
 * @param {string} productId - ID của sản phẩm cần cập nhật
 */
async function updateProductStock(productId) {
  if (!productId) return;

  try {
    const Product = mongoose.model("Product");
    // Import hàm cập nhật stock từ product middlewares
    const { updateProductStockInfo } = require("../product/middlewares");

    const product = await Product.findById(productId);
    if (product) {
      await updateProductStockInfo(product);
    }
  } catch (error) {
    console.error(
      `[variant/middlewares] Lỗi cập nhật tồn kho: ${error.message}`
    );
  }
}

/**
 * Áp dụng middleware cho Variant Schema
 * @param {mongoose.Schema} schema - Schema để áp dụng middleware
 */
const applyMiddlewares = (schema) => {
  // Pre-save hook: TỰ ĐỘNG TẠO SKU cho các sizes chưa có SKU
  schema.pre("save", async function (next) {
    try {
      if (!this.sizes || this.sizes.length === 0) {
        return next();
      }

      // Lấy thông tin cần thiết để tạo SKU
      const Product = mongoose.model("Product");
      const Color = mongoose.model("Color");
      const Size = mongoose.model("Size");
      const InventoryItem = mongoose.model("InventoryItem");
      const Variant = mongoose.model("Variant");

      const productDoc = await Product.findById(this.product).select("name");
      const colorDoc = await Color.findById(this.color).select("name");

      if (!productDoc || !colorDoc) {
        return next(
          new Error("Không tìm thấy thông tin sản phẩm hoặc màu sắc")
        );
      }

      // Duyệt qua từng size và tạo SKU nếu chưa có
      for (let i = 0; i < this.sizes.length; i++) {
        const sizeItem = this.sizes[i];

        // Nếu đã có SKU, bỏ qua
        if (sizeItem.sku) continue;

        // Lấy thông tin size
        const sizeDoc = await Size.findById(sizeItem.size).select("value");
        if (!sizeDoc) {
          console.warn(`Không tìm thấy size ${sizeItem.size}`);
          continue;
        }

        // Retry logic: thử tạo SKU unique tối đa 10 lần
        let sku;
        let attempt = 0;
        const maxAttempts = 10;

        while (attempt < maxAttempts) {
          sku = generateSKU({
            productName: productDoc.name,
            colorName: colorDoc.name,
            gender: this.gender,
            sizeValue: sizeDoc.value,
            productId: this.product.toString(),
          });

          // Kiểm tra SKU đã tồn tại chưa (cả trong Variant và InventoryItem)
          const [existingInVariant, existingInInventory] = await Promise.all([
            Variant.findOne(
              { "sizes.sku": sku, _id: { $ne: this._id } },
              { _id: 1 }
            ),
            InventoryItem.findOne({ sku }, { _id: 1 }),
          ]);

          if (!existingInVariant && !existingInInventory) {
            break; // SKU unique, thoát loop
          }

          attempt++;
          console.log(
            `⚠️ SKU ${sku} đã tồn tại, thử lại lần ${attempt}/${maxAttempts}`
          );
        }

        // Nếu sau maxAttempts vẫn bị trùng, thêm timestamp để đảm bảo unique
        if (attempt >= maxAttempts) {
          const timestamp = Date.now().toString().slice(-4);
          const random = Math.random()
            .toString(36)
            .substring(2, 5)
            .toUpperCase();
          sku = `${sku.split("-").slice(0, 4).join("-")}-${timestamp}${random}`;
          console.warn(
            `⚠️ Đã vượt quá ${maxAttempts} lần thử, dùng SKU với timestamp: ${sku}`
          );
        }

        // Gán SKU cho size
        this.sizes[i].sku = sku;
        console.log(
          `✅ Đã tạo SKU cho ${productDoc.name} - ${colorDoc.name} - ${sizeDoc.value}: ${sku}`
        );
      }

      next();
    } catch (error) {
      console.error("[PRE-SAVE] Lỗi khi tạo SKU:", error);
      next(error);
    }
  });

  // Post-save hook: Sau khi lưu, cập nhật thông tin sản phẩm liên quan
  schema.post("save", async function () {
    try {
      if (this.product) {
        await updateProductStock(this.product);
      }
    } catch (error) {
      console.error(
        "[POST-SAVE] Lỗi khi cập nhật tồn kho sau lưu variant:",
        error
      );
    }
  });

  // Pre-findOneAndUpdate hook: Khi sử dụng findOneAndUpdate để cập nhật document Variant
  schema.pre("findOneAndUpdate", async function (next) {
    try {
      const update = this.getUpdate();
      if (!update) return next();

      // Lưu productId để cập nhật sau khi update
      const doc = await this.model.findOne(this.getQuery());
      if (doc && doc.product) {
        this._productId = doc.product;
      }

      //  KHÔNG CÒN TỰ ĐỘNG TẠO SKU hoặc tính giá trong middleware
      //  SKU được tạo bởi inventory.service.js
      //  Giá được quản lý bởi InventoryItem

      // Xử lý khi khôi phục variant (đặt deletedAt thành null)
      if (update.$set && update.$set.deletedAt === null) {
        try {
          const doc = await this.model.findOne(this.getQuery(), {
            includeDeleted: true,
          });

          if (doc && doc.sizes && Array.isArray(doc.sizes)) {
            // Kiểm tra xem có SKU nào bị trùng khi khôi phục không
            const skus = doc.sizes.map((size) => size.sku).filter(Boolean);

            // Tìm tất cả variant có SKU trùng với các SKU của variant đang khôi phục
            const duplicateSKUs = [];
            for (const sku of skus) {
              if (sku) {
                // Tìm các SKU trùng lặp trong các variant khác không bị xóa
                const duplicateExists = await this.model.findOne({
                  "sizes.sku": sku,
                  _id: { $ne: doc._id },
                  deletedAt: null,
                });

                if (duplicateExists) {
                  duplicateSKUs.push(sku);
                }
              }
            }

            // Nếu có SKU bị trùng, xóa SKU cũ (sẽ được tạo lại bởi pre-save middleware)
            if (duplicateSKUs.length > 0) {
              console.log(
                `⚠️ Phát hiện ${duplicateSKUs.length} SKU trùng lặp khi khôi phục variant`
              );

              // Lấy sizes hiện tại
              const updatedSizes = JSON.parse(JSON.stringify(doc.sizes));

              // XÓA SKU cũ (sẽ được tạo lại tự động bởi pre-save middleware)
              updatedSizes.forEach((size, index) => {
                if (size.sku && duplicateSKUs.includes(size.sku)) {
                  updatedSizes[index].sku = null;
                  console.log(
                    `🔄 Đã xóa SKU trùng "${size.sku}", sẽ được tạo lại tự động`
                  );
                }
              });

              // Cập nhật mảng sizes với các SKU đã xóa
              if (!update.$set) update.$set = {};
              update.$set.sizes = updatedSizes;
            }
          }

          // Đặt trạng thái mặc định khi khôi phục là inactive
          if (update.$set.isActive === undefined) {
            update.$set.isActive = false;
          }
        } catch (error) {
          console.error(
            "Lỗi khi kiểm tra SKU trùng lặp khi khôi phục variant:",
            error
          );
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  });

  // Post-findOneAndUpdate hook: Sau khi cập nhật, cập nhật thông tin sản phẩm liên quan
  schema.post("findOneAndUpdate", async function (doc) {
    try {
      // Sử dụng productId đã lưu trữ hoặc từ document cập nhật
      const productId = this._productId || (doc && doc.product);
      if (productId) {
        await updateProductStock(productId);
        // Xóa biến tạm để tránh rò rỉ bộ nhớ
        delete this._productId;
      }
    } catch (error) {
      console.error(
        "[POST-FINDONEANDUPDATE] Lỗi khi cập nhật tồn kho sau cập nhật variant:",
        error
      );
    }
  });

  // Pre-deleteOne/findOneAndDelete hook: Trước khi xóa, lưu productId
  schema.pre(/deleteOne|findOneAndDelete/, async function (next) {
    try {
      const doc = await this.model.findOne(this.getQuery());
      if (doc && doc.product) {
        this._productId = doc.product;
      }
      next();
    } catch (error) {
      next(error);
    }
  });

  // Post-deleteOne/findOneAndDelete hook: Sau khi xóa, cập nhật thông tin sản phẩm liên quan
  schema.post(/deleteOne|findOneAndDelete/, async function () {
    try {
      if (this._productId) {
        await updateProductStock(this._productId);
        delete this._productId;
      }
    } catch (error) {
      console.error(
        "[POST-DELETE] Lỗi khi cập nhật tồn kho sau xóa variant:",
        error
      );
    }
  });

  // Post-updateMany hook: Sau khi cập nhật nhiều variant, cập nhật các sản phẩm liên quan
  schema.post("updateMany", async function () {
    try {
      const filter = this.getQuery();

      // Nếu là cập nhật theo productId cụ thể
      if (filter.product) {
        await updateProductStock(filter.product);
      }
      // Nếu cập nhật theo nhiều variant
      else if (filter._id && filter._id.$in) {
        // Lấy danh sách productId từ các variant bị ảnh hưởng
        const Variant = mongoose.model("Variant");
        const variants = await Variant.find({
          _id: { $in: filter._id.$in },
        }).distinct("product");

        // Cập nhật tất cả các sản phẩm liên quan
        for (const productId of variants) {
          await updateProductStock(productId);
        }
      }
    } catch (error) {
      console.error(
        "[POST-UPDATEMANY] Lỗi khi cập nhật tồn kho sau updateMany:",
        error
      );
    }
  });

  // Middleware POST-SOFTDELETE và POST-RESTORE: Cập nhật stock sau khi xóa mềm hoặc khôi phục
  schema.post("softDelete", async function () {
    try {
      if (this.product) {
        await updateProductStock(this.product);
      }
    } catch (error) {
      console.error("[POST-SOFTDELETE] Lỗi cập nhật tồn kho:", error);
    }
  });

  schema.post("restore", async function () {
    try {
      if (this.product) {
        await updateProductStock(this.product);
      }
    } catch (error) {
      console.error("[POST-RESTORE] Lỗi cập nhật tồn kho:", error);
    }
  });
};

module.exports = {
  applyMiddlewares,
  updateProductStock,
  // REMOVED: generateSkuForSize - Dùng utils/skuGenerator.js thay thế
};
