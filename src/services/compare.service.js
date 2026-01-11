const { Variant, Product, Review } = require("@models");
const inventoryService = require("./inventory.service");
const ApiError = require("@utils/ApiError");

const compareService = {
  /**
   * So sánh các biến thể (variants)
   * @param {string[]} variantIds - Mảng các variant IDs
   * @returns {Promise<Array>} Danh sách các biến thể đã được so sánh
   */
  compareVariants: async (variantIds) => {
    // Lấy thông tin các biến thể
    const variants = await Variant.find({
      _id: { $in: variantIds },
      isActive: true,
      deletedAt: null,
    })
      .populate("color", "name code type colors")
      .populate("sizes.size", "value type description")
      .populate({
        path: "product",
        match: { isActive: true, deletedAt: null },
        select: "name slug description category brand images tags",
        populate: [
          { path: "category", select: "name slug" },
          { path: "brand", select: "name slug logo" },
          { path: "tags", select: "name type" },
        ],
      })
      .lean();

    // Lọc ra những variant có product hợp lệ
    const validVariants = variants.filter((v) => v.product);

    if (validVariants.length !== variantIds.length) {
      throw new ApiError(
        404,
        "Một số biến thể không tồn tại hoặc không khả dụng"
      );
    }

    // FIXED Bug #3: Batch load all InventoryItems to avoid N+1 queries
    const allVariantIds = validVariants.map((v) => v._id);
    const allInventoryItems = await require("@models")
      .InventoryItem.find({
        variant: { $in: allVariantIds },
      })
      .lean();

    // Create map for O(1) lookup: variantId_sizeId -> inventoryItem
    const inventoryMap = new Map(
      allInventoryItems.map((item) => [`${item.variant}_${item.size}`, item])
    );

    // Bổ sung thông tin cho mỗi biến thể
    const compareData = await Promise.all(
      validVariants.map(async (variant) => {
        // Lấy thông tin giá từ inventory
        const inventorySummary = await calculateVariantInventorySummary(
          variant
        );

        // Lấy thông tin rating của sản phẩm
        const productRating = await getProductRating(variant.product._id);

        // Tạo danh sách sizes có sẵn (sử dụng inventoryMap thay vì query)
        const availableSizes = [];
        for (const s of variant.sizes) {
          if (!s.size || !s.size._id) continue;

          // Lấy quantity từ inventoryMap (O(1) lookup)
          const invItem = inventoryMap.get(`${variant._id}_${s.size._id}`);

          const quantity = invItem?.quantity || 0;
          if (quantity > 0) {
            availableSizes.push({
              _id: s.size._id,
              value: s.size.value,
              quantity: quantity,
              sku: s.sku,
            });
          }
        }

        // Map color field để tương thích với FE
        const colorData = variant.color
          ? {
              _id: variant.color._id,
              name: variant.color.name,
              hexCode: variant.color.code, // Map code -> hexCode
              code: variant.color.code,
              type: variant.color.type,
              colors: variant.color.colors,
            }
          : null;

        return {
          _id: variant._id,
          product: {
            _id: variant.product._id,
            name: variant.product.name,
            slug: variant.product.slug,
            description: variant.product.description,
            category: variant.product.category,
            brand: variant.product.brand,
            tags: variant.product.tags,
            images: variant.product.images || [],
          },
          color: colorData,
          gender: variant.gender,
          images: variant.imagesvariant || [],
          availableSizes,
          totalQuantity: inventorySummary.totalQuantity,
          stockStatus: inventorySummary.stockStatus,
          priceRange: inventorySummary.priceRange,
          discount: inventorySummary.discount,
          rating: productRating.rating,
          numReviews: productRating.numReviews,
          specifications: {
            material: variant.product.tags?.find((t) => t.type === "MATERIAL")
              ?.name,
            useCase: variant.product.tags?.find((t) => t.type === "USECASE")
              ?.name,
          },
        };
      })
    );

    return compareData;
  },

  /**
   * So sánh các sản phẩm (products)
   * @param {string[]} productIds - Mảng các product IDs
   * @returns {Promise<Array>} Danh sách các sản phẩm đã được so sánh
   */
  compareProducts: async (productIds) => {
    // Lấy thông tin các sản phẩm
    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true,
      deletedAt: null,
    })
      .populate("category", "name slug")
      .populate("brand", "name slug logo")
      .populate("tags", "name type description")
      .lean();

    if (products.length !== productIds.length) {
      throw new ApiError(
        404,
        "Một số sản phẩm không tồn tại hoặc không khả dụng"
      );
    }

    // Create a map for fast product lookup by ID
    const productMap = new Map();
    products.forEach((product) => {
      productMap.set(product._id.toString(), product);
    });

    // FIXED Bug #3: Batch load all InventoryItems for all products upfront
    const allInventoryItems = await require("@models")
      .InventoryItem.find({
        product: { $in: productIds },
        quantity: { $gt: 0 },
      })
      .lean();

    // Create map for fast lookup
    const inventoryMapByProduct = new Map();
    allInventoryItems.forEach((item) => {
      const key = `${item.product}_${item.variant}_${item.size}`;
      inventoryMapByProduct.set(key, item);
    });

    // Lấy variants cho mỗi sản phẩm - GIỮA ĐÚNG THỨ TỰ của productIds
    const compareData = await Promise.all(
      productIds.map(async (productId) => {
        const product = productMap.get(productId.toString());
        if (!product) return null; // Skip if product not found

        const variants = await Variant.find({
          product: product._id,
          isActive: true,
          deletedAt: null,
        })
          .populate("color", "name code type colors")
          .populate("sizes.size", "value type description")
          .lean();

        // Tính tổng hợp thông tin từ tất cả variants
        let totalQuantity = 0;
        let minPrice = null;
        let maxPrice = null;
        let maxDiscount = 0;
        const availableColors = [];
        const availableSizes = new Set();
        const sizeQuantityMap = new Map(); // Map để lưu số lượng theo size

        for (const variant of variants) {
          // Tính inventory summary
          const inventorySummary = await calculateVariantInventorySummary(
            variant
          );

          totalQuantity += inventorySummary.totalQuantity;

          // Cập nhật price range
          if (inventorySummary.priceRange.min !== null) {
            if (
              minPrice === null ||
              inventorySummary.priceRange.min < minPrice
            ) {
              minPrice = inventorySummary.priceRange.min;
            }
          }
          if (inventorySummary.priceRange.max !== null) {
            if (
              maxPrice === null ||
              inventorySummary.priceRange.max > maxPrice
            ) {
              maxPrice = inventorySummary.priceRange.max;
            }
          }

          // Cập nhật discount
          if (inventorySummary.discount.maxPercent > maxDiscount) {
            maxDiscount = inventorySummary.discount.maxPercent;
          }

          // Thu thập colors (với hexCode mapping)
          if (
            variant.color &&
            !availableColors.find(
              (c) => c._id.toString() === variant.color._id.toString()
            )
          ) {
            availableColors.push({
              _id: variant.color._id,
              name: variant.color.name,
              code: variant.color.code,
              hexCode: variant.color.code, // Map cho FE
              type: variant.color.type,
              colors: variant.color.colors,
            });
          }

          // Thu thập sizes với quantity (sử dụng inventoryMapByProduct để check stock - O(1) lookup)
          for (const s of variant.sizes) {
            if (s.size && s.size.value) {
              // Check nếu size có stock trong inventoryMapByProduct
              const key = `${product._id}_${variant._id}_${
                s.size._id || s.size
              }`;
              const inventoryItem = inventoryMapByProduct.get(key);
              const quantity = inventoryItem ? inventoryItem.quantity : 0;

              if (quantity > 0) {
                availableSizes.add(s.size.value);
                // Cộng dồn số lượng theo size value
                const currentQty = sizeQuantityMap.get(s.size.value) || 0;
                sizeQuantityMap.set(s.size.value, currentQty + quantity);
              }
            }
          }
        }

        // Lấy rating
        const productRating = await getProductRating(product._id);

        return {
          _id: product._id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          category: product.category,
          brand: product.brand,
          tags: product.tags,
          images: product.images || [],
          variantSummary: {
            total: variants.length,
            colors: availableColors,
            colorCount: availableColors.length,
            // Trả về sizes dạng object với value và quantity
            sizes: Array.from(availableSizes)
              .sort((a, b) => parseFloat(a) - parseFloat(b))
              .map((sizeValue) => ({
                value: sizeValue,
                quantity: sizeQuantityMap.get(sizeValue) || 0,
              })),
            sizeCount: availableSizes.size,
          },
          priceRange: {
            min: minPrice,
            max: maxPrice,
            isSinglePrice: minPrice === maxPrice,
          },
          discount: {
            hasDiscount: maxDiscount > 0,
            maxPercent: maxDiscount,
          },
          rating: productRating.rating,
          numReviews: productRating.numReviews,
        };
      })
    );

    // Filter out null values (products not found)
    return compareData.filter(Boolean);
  },
};

/**
 * Helper: Tính inventory summary cho variant
 * @private
 */
async function calculateVariantInventorySummary(variant) {
  let totalQuantity = 0;
  let minPrice = null;
  let maxPrice = null;
  let minPriceFinal = null;
  let maxPriceFinal = null;
  let maxDiscountPercent = 0;

  // Lấy thông tin giá từ inventory cho từng size
  for (const sizeObj of variant.sizes || []) {
    if (!sizeObj.size || !sizeObj.size._id) continue;

    // FIXED: Không dùng sizeObj.quantity (đã xóa khỏi schema)
    // totalQuantity sẽ được tính từ InventoryItem bên dưới

    // Lấy pricing từ inventory
    try {
      const pricing = await inventoryService.getVariantSizePricing(
        variant._id,
        sizeObj.size._id
      );

      if (pricing && pricing.price) {
        const price = pricing.price;
        const priceFinal = pricing.priceFinal || price;
        const percentDiscount = pricing.percentDiscount || 0;

        // FIXED: Tính totalQuantity từ InventoryItem
        totalQuantity += pricing.quantity || 0;

        // Cập nhật price range
        if (minPrice === null || price < minPrice) minPrice = price;
        if (maxPrice === null || price > maxPrice) maxPrice = price;
        if (minPriceFinal === null || priceFinal < minPriceFinal)
          minPriceFinal = priceFinal;
        if (maxPriceFinal === null || priceFinal > maxPriceFinal)
          maxPriceFinal = priceFinal;

        if (percentDiscount > maxDiscountPercent) {
          maxDiscountPercent = percentDiscount;
        }
      }
    } catch (err) {
      // Nếu không có pricing, bỏ qua
      console.error(
        `Error getting pricing for variant ${variant._id} size ${sizeObj.size._id}:`,
        err.message
      );
    }
  }

  // Xác định stock status
  let stockStatus = "out_of_stock";
  if (totalQuantity > 100) {
    stockStatus = "in_stock";
  } else if (totalQuantity > 0) {
    stockStatus = "low_stock";
  }

  return {
    totalQuantity,
    stockStatus,
    priceRange: {
      min: minPriceFinal || minPrice,
      max: maxPriceFinal || maxPrice,
      isSinglePrice:
        (minPriceFinal || minPrice) === (maxPriceFinal || maxPrice),
    },
    discount: {
      hasDiscount: maxDiscountPercent > 0,
      maxPercent: maxDiscountPercent,
    },
  };
}

/**
 * Helper: Lấy rating của sản phẩm
 * @private
 */
async function getProductRating(productId) {
  // FIXED Bug #26: Ensure productId is converted to ObjectId for aggregate
  const mongoose = require("mongoose");
  let productObjId;
  try {
    productObjId = new mongoose.Types.ObjectId(productId);
  } catch (err) {
    console.error(`[getProductRating] Invalid productId: ${productId}`);
    return { rating: 0, numReviews: 0 };
  }

  const stats = await Review.aggregate([
    {
      $match: {
        product: productObjId,
        isActive: true,
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    return {
      rating: Math.round(stats[0].avgRating * 10) / 10,
      numReviews: stats[0].count,
    };
  }

  return {
    rating: 0,
    numReviews: 0,
  };
}

module.exports = compareService;
