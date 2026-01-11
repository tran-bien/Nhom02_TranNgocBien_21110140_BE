const { InventoryItem, Product } = require("@models");
const mongoose = require("mongoose");
const ApiError = require("@utils/ApiError");

/**
 * Report Service - BÁO CÁO KHO HÀNG
 *
 * Module này focus vào báo cáo tồn kho chi tiết:
 * - Sản phẩm sắp hết hàng (low stock)
 * - Sản phẩm hết hàng (out of stock)
 * - Group by product với thông tin variant/size
 *
 * Các thống kê khác đã có ở:
 * - dashboardService: doanh thu, sản phẩm bán chạy, thống kê tổng quan
 * - inventoryService.getInventoryStats(): thống kê tồn kho cơ bản
 */
const reportService = {
  /**
   * Lấy báo cáo tồn kho chi tiết
   * Group by product, hiển thị các variant/size với số lượng tồn
   *
   * @param {Object} query - Tham số lọc
   * @param {number} query.lowStock - Ngưỡng cảnh báo hết hàng (mặc định: 5)
   * @param {string} query.category - Filter theo category ID
   * @param {string} query.sortBy - 'stock' | 'name'
   * @param {string} query.order - 'asc' | 'desc'
   * @param {string} query.includeInactive - 'true' | 'false'
   * @returns {Object} - Dữ liệu báo cáo tồn kho
   */
  getInventoryReport: async (query = {}) => {
    try {
      const {
        lowStock = 5,
        category,
        sortBy = "stock",
        order: sortOrder = "asc",
        includeInactive = "false",
      } = query;

      // Xây dựng pipeline để lấy báo cáo tồn kho từ InventoryItem
      const pipeline = [
        // Match InventoryItem chưa bị xóa
        {
          $match: {
            deletedAt: null,
          },
        },
        // Lookup Product
        {
          $lookup: {
            from: "products",
            localField: "product",
            foreignField: "_id",
            as: "productInfo",
          },
        },
        {
          $unwind: "$productInfo",
        },
        {
          $match: {
            "productInfo.deletedAt": null,
            ...(includeInactive === "false" && {
              "productInfo.isActive": true,
            }),
            ...(category &&
              mongoose.Types.ObjectId.isValid(category) && {
                "productInfo.category": new mongoose.Types.ObjectId(category),
              }),
          },
        },
        // Lookup variant
        {
          $lookup: {
            from: "variants",
            localField: "variant",
            foreignField: "_id",
            as: "variantInfo",
          },
        },
        {
          $unwind: {
            path: "$variantInfo",
            preserveNullAndEmptyArrays: true,
          },
        },
        // Filter inactive variants if needed
        ...(includeInactive === "false"
          ? [
              {
                $match: {
                  "variantInfo.isActive": true,
                  "variantInfo.deletedAt": null,
                },
              },
            ]
          : []),
        // Lookup size
        {
          $lookup: {
            from: "sizes",
            localField: "size",
            foreignField: "_id",
            as: "sizeInfo",
          },
        },
        {
          $unwind: {
            path: "$sizeInfo",
            preserveNullAndEmptyArrays: true,
          },
        },
        // Lookup color
        {
          $lookup: {
            from: "colors",
            localField: "variantInfo.color",
            foreignField: "_id",
            as: "colorInfo",
          },
        },
        {
          $unwind: {
            path: "$colorInfo",
            preserveNullAndEmptyArrays: true,
          },
        },
        // Group by product
        {
          $group: {
            _id: "$product",
            name: { $first: "$productInfo.name" },
            slug: { $first: "$productInfo.slug" },
            category: { $first: "$productInfo.category" },
            brand: { $first: "$productInfo.brand" },
            isActive: { $first: "$productInfo.isActive" },
            totalStock: { $sum: "$quantity" },
            variants: {
              $push: {
                variantId: "$variant",
                colorName: "$colorInfo.name",
                colorCode: "$colorInfo.code",
                isActive: "$variantInfo.isActive",
                sizes: {
                  sizeId: "$size",
                  sizeName: "$sizeInfo.value",
                  sizeDescription: "$sizeInfo.description",
                  quantity: "$quantity",
                  sku: "$sku",
                },
              },
            },
          },
        },
      ];

      // Xử lý bộ lọc low stock
      if (lowStock) {
        pipeline.push({
          $match: {
            totalStock: { $lte: parseInt(lowStock) },
          },
        });
      }

      // Thêm sort stage
      const sortOrderNum = sortOrder === "desc" ? -1 : 1;
      let sortStage = {};

      if (sortBy === "stock") {
        sortStage = {
          $sort: { totalStock: sortOrderNum },
        };
      } else if (sortBy === "name") {
        sortStage = {
          $sort: { name: sortOrderNum },
        };
      }

      pipeline.push(sortStage);

      // Thực hiện truy vấn
      const inventoryData = await InventoryItem.aggregate(pipeline);

      // Populate thông tin category và brand
      const productIds = inventoryData.map((p) => p._id);
      const productsWithCategories = await Product.find({
        _id: { $in: productIds },
      })
        .populate("category", "name")
        .populate("brand", "name logo")
        .lean();

      // Tạo map cho thông tin category và brand
      const productInfoMap = {};
      productsWithCategories.forEach((p) => {
        productInfoMap[p._id.toString()] = {
          category: p.category,
          brand: p.brand,
        };
      });

      // Bổ sung thông tin category và brand
      inventoryData.forEach((product) => {
        const productInfo = productInfoMap[product._id.toString()];
        if (productInfo) {
          product.categoryName = productInfo.category
            ? productInfo.category.name
            : null;
          product.brandName = productInfo.brand ? productInfo.brand.name : null;
          product.brandLogo =
            productInfo.brand && productInfo.brand.logo
              ? productInfo.brand.logo.url
              : null;
        }
      });

      // Tính tổng số lượng sản phẩm trong kho
      const totalInventory = inventoryData.reduce(
        (sum, product) => sum + product.totalStock,
        0
      );

      // Đếm số sản phẩm hết hàng
      const outOfStockCount = inventoryData.filter(
        (product) => product.totalStock === 0
      ).length;

      // Đếm số sản phẩm sắp hết hàng
      const lowStockCount = inventoryData.filter(
        (product) =>
          product.totalStock > 0 && product.totalStock <= parseInt(lowStock)
      ).length;

      return {
        success: true,
        data: {
          inventoryData,
          summary: {
            totalProducts: inventoryData.length,
            totalInventory,
            outOfStockCount,
            lowStockCount,
          },
          filters: {
            lowStock: parseInt(lowStock),
            category,
            sortBy,
            order: sortOrder,
            includeInactive: includeInactive === "true",
          },
        },
      };
    } catch (error) {
      console.error("Error getting inventory report:", error);
      throw new ApiError(500, "Lỗi khi lấy báo cáo tồn kho: " + error.message);
    }
  },
};

module.exports = reportService;
