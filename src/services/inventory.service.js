const {
  InventoryItem,
  InventoryTransaction,
  Variant,
  Product,
  Color,
  Size,
} = require("../models");
const ApiError = require("../utils/ApiError");
const { generateSKU } = require("../utils/skuGenerator");

/**
 * DEPRECATED - Variant không còn lưu quantity
 * InventoryItem là single source of truth
 */
const syncInventoryToVariant = async (inventoryItem) => {
  return;
};

/**
 * Tính giá bán từ giá vốn
 * @param {Number} costPrice - Giá nhập
 * @param {Number} targetProfitPercent - % Lợi nhuận mong muốn (0-1000)
 * @param {Number} percentDiscount - % Giảm giá (0-100)
 * @returns {Object} { calculatedPrice, calculatedPriceFinal, profitPerItem, margin, markup }
 *
 * Formula:
 * - basePrice = costPrice × (1 + targetProfitPercent/100)
 * - finalPrice = basePrice × (1 - percentDiscount/100)
 * - profit = finalPrice - costPrice
 * - margin = (profit / finalPrice) × 100
 * - markup = (profit / costPrice) × 100
 */
const calculatePrice = (
  costPrice,
  targetProfitPercent,
  percentDiscount = 0
) => {
  // FIX: Handle costPrice = 0 để tránh NaN cho margin/markup
  if (!costPrice || costPrice === 0) {
    return {
      calculatedPrice: 0,
      calculatedPriceFinal: 0,
      profitPerItem: 0,
      margin: 0,
      markup: 0,
    };
  }

  const basePrice = costPrice * (1 + targetProfitPercent / 100);
  const finalPrice = basePrice * (1 - percentDiscount / 100);
  const profitPerItem = finalPrice - costPrice;

  // FIX: Handle division by zero
  const margin = finalPrice > 0 ? (profitPerItem / finalPrice) * 100 : 0;
  const markup = costPrice > 0 ? (profitPerItem / costPrice) * 100 : 0;

  return {
    calculatedPrice: Math.round(basePrice),
    calculatedPriceFinal: Math.round(finalPrice),
    profitPerItem: Math.round(profitPerItem),
    margin: parseFloat(margin.toFixed(2)),
    markup: parseFloat(markup.toFixed(2)),
  };
};

/**
 * Lấy hoặc tạo InventoryItem
 * Unique constraint: product + variant + size
 * Auto generate SKU nếu chưa có
 * @param {ObjectId} product - Product ID
 * @param {ObjectId} variant - Variant ID
 * @param {ObjectId} size - Size ID
 * @returns {InventoryItem}
 */
const getOrCreateInventoryItem = async (product, variant, size) => {
  console.log("===== getOrCreateInventoryItem DEBUG =====");
  console.log("Received product:", product);
  console.log("Received variant:", variant);
  console.log("Received size:", size);

  let inventoryItem = await InventoryItem.findOne({
    product,
    variant,
    size,
  });

  if (!inventoryItem) {
    // ĐỌC SKU từ Variant (đã được tạo tự động trong variant/middlewares.js)
    // SKU được tạo bởi pre-save hook, đảm bảo unique và format chuẩn
    const variantDoc = await Variant.findById(variant)
      .select("sizes")
      .populate("sizes.size");

    if (!variantDoc) {
      throw new ApiError(404, "Không tìm thấy variant");
    }

    const sizeData = variantDoc.sizes.find(
      (s) => s.size._id.toString() === size.toString()
    );

    if (!sizeData || !sizeData.sku) {
      throw new ApiError(
        400,
        "Size không tồn tại trong variant hoặc chưa có SKU. Vui lòng lưu lại variant để tạo SKU tự động."
      );
    }

    const sku = sizeData.sku;

    inventoryItem = await InventoryItem.create({
      product,
      variant,
      size,
      sku,
      quantity: 0,
      costPrice: 0,
      averageCostPrice: 0,
    });

    // KHÔNG CẦN sync SKU lên Variant nữa (đã có sẵn từ pre-save hook)
  }

  return inventoryItem;
};

// REMOVED: syncSKUToVariant function
// SKU giờ được tạo tự động trong variant/middlewares.js (pre-save hook)
// Không cần sync từ InventoryItem lên Variant nữa

/**
 * NHẬP KHO (Stock In)
 * - Tăng số lượng tồn kho
 * - Tính weighted average cost
 * - Tính giá bán (basePrice, finalPrice, profit, margin, markup)
 * - Tạo InventoryTransaction (type: IN)
 * - Cập nhật Product.totalQuantity và stockStatus
 *
 * @param {Object} data - { product, variant, size, quantity, costPrice, targetProfitPercent, percentDiscount, reason, notes }
 * @param {ObjectId} performedBy - User ID thực hiện
 * @returns {Object} { inventoryItem, transaction, priceCalculation }
 */
const stockIn = async (data, performedBy) => {
  const {
    product,
    variant,
    size,
    quantity,
    costPrice,
    targetProfitPercent = 30,
    percentDiscount = 0,
    reason = "restock",
    notes,
  } = data;

  // FIXED Bug #3: Cho phép costPrice=0 khi return, dùng averageCostPrice
  let actualCostPrice = costPrice;

  // Nếu reason = 'return' và costPrice = 0, lấy averageCostPrice từ InventoryItem hiện tại
  if (reason === "return" && (!costPrice || costPrice === 0)) {
    const existingItem = await InventoryItem.findOne({
      product,
      variant,
      size,
    });

    if (existingItem && existingItem.averageCostPrice > 0) {
      actualCostPrice = existingItem.averageCostPrice;
      console.log(
        `[stockIn] Sử dụng averageCostPrice=${actualCostPrice} cho return`
      );
    } else {
      // Fallback: nếu không có averageCostPrice, dùng costPrice=0 (cho phép)
      actualCostPrice = 0;
      console.warn(
        `[stockIn] Không tìm thấy averageCostPrice, sử dụng costPrice=0 cho return`
      );
    }
  }
  // NOTE: costPrice and quantity validation removed - already validated in inventory.validator.js

  const inventoryItem = await getOrCreateInventoryItem(product, variant, size);

  // FIXED Bug #7: Thêm duplicate check giống stockOut()
  if (data.reference) {
    const existingTransaction = await InventoryTransaction.findOne({
      inventoryItem: inventoryItem._id,
      type: "IN",
      reason,
      reference: data.reference,
    });

    if (existingTransaction) {
      console.warn(
        `[stockIn] Duplicate transaction detected for reference=${data.reference}`
      );
      throw new ApiError(
        409,
        `Giao dịch nhập kho cho tham chiếu này đã tồn tại (Transaction ID: ${existingTransaction._id})`
      );
    }
  }

  const quantityBefore = inventoryItem.quantity;
  const quantityAfter = quantityBefore + quantity;

  const totalCost = actualCostPrice * quantity;
  const previousTotalCost = inventoryItem.averageCostPrice * quantityBefore;
  const avgCostBefore = quantityBefore > 0 ? inventoryItem.averageCostPrice : 0;
  const newAverageCostPrice =
    quantityAfter > 0
      ? (previousTotalCost + totalCost) / quantityAfter
      : actualCostPrice;

  // ===== FIX: Dùng giá vốn trung bình (weighted average) để tính giá bán =====
  // Điều này đảm bảo giá bán phản ánh chi phí thực tế của toàn bộ tồn kho
  const pricingBaseCost =
    newAverageCostPrice > 0 ? newAverageCostPrice : actualCostPrice;

  const priceCalculation = calculatePrice(
    pricingBaseCost, // Dùng giá vốn trung bình thay vì giá lô mới
    targetProfitPercent,
    percentDiscount
  );

  inventoryItem.quantity = quantityAfter;
  inventoryItem.costPrice = actualCostPrice; // Giữ giá lô cuối để reference
  inventoryItem.averageCostPrice = newAverageCostPrice; // Giá vốn TB mới
  inventoryItem.sellingPrice = priceCalculation.calculatedPrice;
  inventoryItem.discountPercent = percentDiscount;
  inventoryItem.finalPrice = priceCalculation.calculatedPriceFinal;
  inventoryItem.lastPriceUpdate = new Date();
  await inventoryItem.save();

  const transaction = await InventoryTransaction.create({
    type: "IN",
    inventoryItem: inventoryItem._id,
    quantityBefore,
    quantityChange: quantity,
    quantityAfter,
    costPrice: actualCostPrice, // Giá của lô nhập này
    averageCostPriceBefore: avgCostBefore, // Tracking giá vốn TB trước
    averageCostPriceAfter: newAverageCostPrice, // Tracking giá vốn TB sau
    totalCost,
    targetProfitPercent,
    percentDiscount,
    ...priceCalculation,
    reason,
    performedBy,
    notes,
  });

  await updateProductStockFromInventory(product);

  return {
    inventoryItem: await inventoryItem.populate("product variant size"),
    transaction,
    priceCalculation,
  };
};

/**
 * XUẤT KHO (Stock Out)
 * - Kiểm tra số lượng tồn kho đủ không
 * - Kiểm tra duplicate transaction (nếu có reference là orderId)
 * - Trừ số lượng
 * - Tạo InventoryTransaction (type: OUT)
 * - Cập nhật Product.totalQuantity và stockStatus
 *
 * Use cases:
 * - Auto: Gán shipper cho order (reason: "sale")
 * - Manual: Xuất hàng hư hỏng, mất mát (reason: "damage")
 *
 * @param {Object} data - { product, variant, size, quantity, reason, reference, notes }
 * @param {ObjectId} performedBy - User ID thực hiện
 * @returns {Object} { inventoryItem, transaction }
 */
const stockOut = async (data, performedBy) => {
  const {
    product,
    variant,
    size,
    quantity,
    reason = "sale",
    reference,
    notes,
  } = data;

  if (quantity <= 0) {
    throw new ApiError(400, "Số lượng xuất phải lớn hơn 0");
  }

  const inventoryItem = await InventoryItem.findOne({
    product,
    variant,
    size,
  });

  if (!inventoryItem) {
    throw new ApiError(404, "Không tìm thấy sản phẩm trong kho");
  }

  if (inventoryItem.quantity < quantity) {
    throw new ApiError(
      400,
      `Không đủ hàng trong kho. Hiện có: ${inventoryItem.quantity}, yêu cầu: ${quantity}`
    );
  }

  // KIỂM TRA DUPLICATE TRANSACTION (nếu có reference là orderId)
  if (reference) {
    const existingTransaction = await InventoryTransaction.findOne({
      inventoryItem: inventoryItem._id,
      type: "OUT",
      reason,
      reference,
    });

    if (existingTransaction) {
      throw new ApiError(
        409,
        `Giao dịch xuất kho cho đơn hàng này đã tồn tại (Transaction ID: ${existingTransaction._id})`
      );
    }
  }

  const quantityBefore = inventoryItem.quantity;
  const quantityAfter = quantityBefore - quantity;

  inventoryItem.quantity = quantityAfter;
  await inventoryItem.save();

  await syncInventoryToVariant(inventoryItem);

  let transaction;
  try {
    transaction = await InventoryTransaction.create({
      type: "OUT",
      inventoryItem: inventoryItem._id,
      quantityBefore,
      quantityChange: -quantity,
      quantityAfter,
      costPrice: inventoryItem.averageCostPrice,
      totalCost: inventoryItem.averageCostPrice * quantity,
      reason,
      reference,
      performedBy,
      notes,
    });
  } finally {
    // FIXED Bug #12: Đảm bảo luôn update Product.totalQuantity dù transaction fail
    try {
      await updateProductStockFromInventory(product);
    } catch (err) {
      console.error("[stockOut] Lỗi khi update Product stock:", err);
    }
  }

  return {
    inventoryItem: await inventoryItem.populate("product variant size"),
    transaction,
  };
};

/**
 * ĐIỀU CHỈNH KHO (Adjust Stock)
 * - Đặt số lượng mới trực tiếp (không cộng/trừ)
 * - Tạo InventoryTransaction (type: ADJUST)
 * - quantityChange có thể dương (tăng) hoặc âm (giảm)
 *
 * Use cases:
 * - Kiểm kê định kỳ
 * - Sửa sai số liệu
 * - Hàng hư hỏng/mất mát
 *
 * @param {Object} data - { product, variant, size, newQuantity, reason, notes }
 * @param {ObjectId} performedBy - User ID thực hiện
 * @returns {Object} { inventoryItem, transaction }
 */
const adjustStock = async (data, performedBy) => {
  const {
    product,
    variant,
    size,
    newQuantity,
    reason = "adjustment",
    notes,
  } = data;

  const inventoryItem = await getOrCreateInventoryItem(product, variant, size);

  const quantityBefore = inventoryItem.quantity;
  const quantityChange = newQuantity - quantityBefore;

  inventoryItem.quantity = newQuantity;
  await inventoryItem.save();

  await syncInventoryToVariant(inventoryItem);

  const transaction = await InventoryTransaction.create({
    type: "ADJUST",
    inventoryItem: inventoryItem._id,
    quantityBefore,
    quantityChange,
    quantityAfter: newQuantity,
    costPrice: inventoryItem.averageCostPrice,
    totalCost: inventoryItem.averageCostPrice * Math.abs(quantityChange),
    reason,
    performedBy,
    notes,
  });

  await updateProductStockFromInventory(product);

  return {
    inventoryItem: await inventoryItem.populate("product variant size"),
    transaction,
  };
};

/**
 * Lấy danh sách tồn kho với filter và phân trang
 * @param {Object} filter - (deprecated, không dùng)
 * @param {Object} options - { page, limit, sortBy, sortOrder, product, lowStock, outOfStock }
 * @returns {Object} { items, pagination: { total, page, limit, totalPages } }
 */
const getInventoryList = async (filter = {}, options = {}) => {
  const {
    page = 1,
    limit = 20,
    sortBy = "updatedAt",
    sortOrder = "desc",
    product,
    variant,
    lowStock,
    outOfStock,
  } = options;

  const query = {};

  if (product) {
    query.product = product;
  }

  if (variant) {
    query.variant = variant;
  }

  if (lowStock) {
    query.$expr = { $lte: ["$quantity", "$lowStockThreshold"] };
  }

  if (outOfStock) {
    query.quantity = 0;
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

  const [items, total] = await Promise.all([
    InventoryItem.find(query)
      .populate({
        path: "product",
        select: "name slug brand category",
      })
      .populate({
        path: "variant",
        select: "color gender imagesvariant",
        populate: {
          path: "color",
          select: "name hexCode",
        },
      })
      .populate({
        path: "size",
        select: "value",
      })
      .sort(sort)
      .skip(skip)
      .limit(limit),
    InventoryItem.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Lấy thông tin chi tiết một InventoryItem
 * @param {ObjectId} id - InventoryItem ID
 * @returns {Object} InventoryItem (populated với product, variant, size)
 * @throws {ApiError} 404 nếu không tìm thấy
 */
const getInventoryById = async (id) => {
  const inventory = await InventoryItem.findById(id)
    .populate({
      path: "product",
      select: "name slug brand category",
    })
    .populate({
      path: "variant",
      select: "color gender imagesvariant",
      populate: {
        path: "color",
        select: "name hexCode",
      },
    })
    .populate({
      path: "size",
      select: "value",
    });

  if (!inventory) {
    throw new ApiError(404, "Không tìm thấy mục tồn kho");
  }

  return inventory;
};

/**
 * CẬP NHẬT NGƯỠNG CẢNH BÁO HẾT HÀNG
 * - Sửa lowStockThreshold cho một InventoryItem
 * - Mặc định: 10
 *
 * @param {ObjectId} id - InventoryItem ID
 * @param {Number} lowStockThreshold - Ngưỡng cảnh báo mới
 * @returns {Object} InventoryItem đã cập nhật
 * @throws {ApiError} 404 nếu không tìm thấy
 */
const updateLowStockThreshold = async (id, lowStockThreshold) => {
  const inventory = await InventoryItem.findById(id);

  if (!inventory) {
    throw new ApiError(404, "Không tìm thấy mục tồn kho");
  }

  inventory.lowStockThreshold = lowStockThreshold;
  await inventory.save();

  return inventory;
};

/**
 * LỊCH SỬ GIAO DỊCH KHO HÀNG
 * - Lấy danh sách InventoryTransaction
 * - Filter theo: type (IN/OUT/ADJUST), productId, variantId, sizeId, inventoryItem, startDate, endDate
 *
 * Logic filter productId/variantId/sizeId:
 * 1. Tìm các InventoryItem phù hợp
 * 2. Lấy transactions có inventoryItem.$in
 *
 * @param {Object} options - { page, limit, sortBy, sortOrder, type, productId, variantId, sizeId, inventoryItem, startDate, endDate }
 * @returns {Object} { transactions, pagination: { total, page, limit, totalPages } }
 */
const getTransactionHistory = async (options = {}) => {
  const {
    page = 1,
    limit = 50,
    sortBy = "createdAt",
    sortOrder = "desc",
    type,
    productId,
    variantId,
    sizeId,
    inventoryItem,
    startDate,
    endDate,
  } = options;

  const query = {};

  if (type) {
    query.type = type;
  }

  if (inventoryItem) {
    query.inventoryItem = inventoryItem;
  } else if (productId || variantId || sizeId) {
    const inventoryQuery = {};
    if (productId) inventoryQuery.product = productId;
    if (variantId) inventoryQuery.variant = variantId;
    if (sizeId) inventoryQuery.size = sizeId;

    const inventoryItems = await InventoryItem.find(inventoryQuery).select(
      "_id"
    );
    const inventoryItemIds = inventoryItems.map((item) => item._id);

    if (inventoryItemIds.length > 0) {
      query.inventoryItem = { $in: inventoryItemIds };
    } else {
      return {
        transactions: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      };
    }
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

  const [transactions, total] = await Promise.all([
    InventoryTransaction.find(query)
      .populate({
        path: "inventoryItem",
        populate: "product variant size",
      })
      .populate("performedBy", "name email")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    InventoryTransaction.countDocuments(query),
  ]);

  return {
    transactions,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * THỐNG KÊ TỒN KHO - DASHBOARD ADMIN
 * - Tổng số InventoryItem
 * - Số lượng sắp hết hàng (quantity ≤ lowStockThreshold)
 * - Số lượng hết hàng (quantity = 0)
 * - Tổng giá trị kho (quantity * averageCostPrice)
 *
 * @returns {Object} { totalItems, lowStockItems, outOfStockItems, totalValue }
 */
const getInventoryStats = async () => {
  const [totalItems, lowStockItems, outOfStockItems, totalValue] =
    await Promise.all([
      InventoryItem.countDocuments(),
      InventoryItem.countDocuments({
        $expr: { $lte: ["$quantity", "$lowStockThreshold"] },
      }),
      InventoryItem.countDocuments({ quantity: 0 }),
      InventoryItem.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: { $multiply: ["$quantity", "$averageCostPrice"] },
            },
          },
        },
      ]),
    ]);

  return {
    totalItems,
    lowStockItems,
    outOfStockItems,
    totalValue: totalValue[0]?.total || 0,
  };
};

/**
 * LẤY PRICING CHO MỘT SIZE CỦA VARIANT
 * - Tìm InventoryItem theo variantId + sizeId
 * - Trả về: quantity, cost, pricing từ transaction mới nhất (type: IN)
 *
 * @param {ObjectId} variantId - Variant ID
 * @param {ObjectId} sizeId - Size ID
 * @returns {Object|null} { quantity, costPrice, averageCostPrice, price, pricing }
 */
const getVariantSizePricing = async (variantId, sizeId) => {
  const inventoryItem = await InventoryItem.findOne({
    variant: variantId,
    size: sizeId,
  });

  if (!inventoryItem) {
    return null;
  }

  // FIX: Đọc giá trực tiếp từ InventoryItem (giá đã được tính từ weighted average cost)
  // Thay vì từ transaction để đảm bảo nhất quán
  return {
    quantity: inventoryItem.quantity,
    costPrice: inventoryItem.costPrice,
    averageCostPrice: inventoryItem.averageCostPrice,
    price: inventoryItem.sellingPrice || null,
    priceFinal: inventoryItem.finalPrice || null,
    percentDiscount: inventoryItem.discountPercent || 0,
    // Note: profitPerItem, margin, markup có thể tính lại từ averageCostPrice nếu cần
  };
};

/**
 * LẤY PRICING CHO TOÀN BỘ PRODUCT
 * - Tìm tất cả InventoryItem có quantity > 0 thuộc product
 * - Lấy giá từ transaction mới nhất (type: IN) của mỗi item
 * - Trả về: min, max, hasStock, itemsCount
 *
 * @param {ObjectId} productId - Product ID
 * @returns {Object} { min, max, hasStock, itemsCount }
 */
const getProductPricing = async (productId) => {
  const inventoryItems = await InventoryItem.find({
    product: productId,
    quantity: { $gt: 0 },
  });

  if (inventoryItems.length === 0) {
    return {
      min: 0,
      max: 0,
      hasStock: false,
    };
  }

  // FIX: Đọc giá trực tiếp từ InventoryItem (giá đã được tính từ weighted average cost)
  const prices = inventoryItems
    .map((item) => item.finalPrice || 0)
    .filter((p) => p > 0);

  if (prices.length === 0) {
    return {
      min: 0,
      max: 0,
      hasStock: true,
      itemsCount: inventoryItems.length,
    };
  }

  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    hasStock: true,
    itemsCount: inventoryItems.length,
  };
};

/**
 * CẬP NHẬT Product.totalQuantity VÀ Product.stockStatus
 * - Gọi middleware updateProductStockInfo()
 * - Tự động chạy sau mỗi stockIn/stockOut/adjustStock
 *
 * @param {ObjectId} productId - Product ID
 */
const updateProductStockFromInventory = async (productId) => {
  const Product = require("../models").Product;
  const { updateProductStockInfo } = require("../models/product/middlewares");

  await updateProductStockInfo(productId);
};

/**
 * TÍNH TOÁN THÔNG TIN TỒN KHO CỦA PRODUCT
 * - Aggregate tổng quantity từ tất cả InventoryItem của product
 * - Xác định stockStatus: out_of_stock / low_stock / in_stock
 *
 * Thresholds:
 * - out_of_stock: totalQuantity = 0
 * - low_stock: totalQuantity > 0 && totalQuantity <= 10
 * - in_stock: totalQuantity > 10
 *
 * @param {ObjectId} productId - Product ID
 * @returns {Object} { totalQuantity, stockStatus }
 */
const getProductStockInfo = async (productId) => {
  const mongoose = require("mongoose");

  const result = await InventoryItem.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(productId),
      },
    },
    {
      $group: {
        _id: "$product",
        totalQuantity: { $sum: "$quantity" },
      },
    },
  ]);

  const totalQuantity = result.length > 0 ? result[0].totalQuantity : 0;

  let stockStatus = "out_of_stock";
  if (totalQuantity > 0) {
    const hasLowStock = await InventoryItem.exists({
      product: productId,
      $expr: { $lte: ["$quantity", "$lowStockThreshold"] },
      quantity: { $gt: 0 },
    });

    stockStatus = hasLowStock ? "low_stock" : "in_stock";
  }

  return { totalQuantity, stockStatus };
};

/**
 * RESERVE INVENTORY KHI TẠO ORDER
 * - Kiểm tra và đặt trước số lượng tồn kho
 * - Atomic operation: dùng $inc để tránh race condition
 * - Tự động rollback nếu fail
 *
 * Use case: Khi tạo đơn hàng mới (order.service.js createOrder)
 *
 * @param {Array} orderItems - Danh sách items cần reserve
 * @param {ObjectId} orderId - ID đơn hàng để reference
 * @returns {Object} { success: true, reservedItems: [...] }
 * @throws {ApiError} Nếu không đủ hàng
 */
const reserveInventoryForOrder = async (orderItems, orderId) => {
  const reservedItems = [];

  try {
    for (const item of orderItems) {
      // Support multiple formats for productId extraction
      const productId =
        item.product?._id ||
        item.product ||
        item.variant?.product?._id ||
        item.variant?.product ||
        item.productId;
      const variantId = item.variant?._id || item.variant || item.variantId;
      const sizeId = item.size?._id || item.size || item.sizeId;

      if (!productId || !variantId || !sizeId) {
        console.error(`[reserveInventoryForOrder] Missing info:`, {
          productId,
          variantId,
          sizeId,
          item: JSON.stringify(item, null, 2),
        });
        throw new ApiError(
          400,
          `Thiếu thông tin product/variant/size cho item`
        );
      }

      // ATOMIC: Dùng findOneAndUpdate với $inc để tránh race condition
      const result = await InventoryItem.findOneAndUpdate(
        {
          product: productId,
          variant: variantId,
          size: sizeId,
          quantity: { $gte: item.quantity }, // Chỉ update nếu đủ hàng
        },
        {
          $inc: {
            reservedQuantity: item.quantity, // Tăng số lượng đã reserve
          },
        },
        { new: true }
      );

      if (!result) {
        // Không đủ hàng hoặc không tìm thấy
        const existingItem = await InventoryItem.findOne({
          product: productId,
          variant: variantId,
          size: sizeId,
        });

        const available = existingItem
          ? existingItem.quantity - (existingItem.reservedQuantity || 0)
          : 0;
        throw new ApiError(
          400,
          `Không đủ hàng cho "${item.productName || "sản phẩm"}". Cần: ${
            item.quantity
          }, Còn: ${available}`
        );
      }

      reservedItems.push({
        inventoryItemId: result._id,
        productId,
        variantId,
        sizeId,
        quantity: item.quantity,
      });
    }

    console.log(
      `[reserveInventoryForOrder] Đã reserve ${reservedItems.length} items cho order ${orderId}`
    );
    return { success: true, reservedItems };
  } catch (error) {
    // ROLLBACK: Hủy reserve các items đã thành công
    console.error(
      `[reserveInventoryForOrder] Lỗi, rollback ${reservedItems.length} items:`,
      error.message
    );

    for (const reserved of reservedItems) {
      try {
        await InventoryItem.findByIdAndUpdate(reserved.inventoryItemId, {
          $inc: { reservedQuantity: -reserved.quantity },
        });
      } catch (rollbackError) {
        console.error(`[CRITICAL] Rollback reserve FAILED:`, rollbackError);
      }
    }

    throw error;
  }
};

/**
 * RELEASE INVENTORY RESERVATION
 * - Hủy đặt trước khi order bị cancel trước khi giao cho shipper
 * - Gọi khi: Order cancelled mà chưa inventoryDeducted
 *
 * @param {Array} orderItems - Danh sách items cần release
 * @param {ObjectId} orderId - ID đơn hàng để log
 */
const releaseInventoryReservation = async (orderItems, orderId) => {
  for (const item of orderItems) {
    const productId =
      item.variant?.product?._id || item.variant?.product || item.productId;
    const variantId = item.variant?._id || item.variant || item.variantId;
    const sizeId = item.size?._id || item.size || item.sizeId;

    try {
      await InventoryItem.findOneAndUpdate(
        {
          product: productId,
          variant: variantId,
          size: sizeId,
          reservedQuantity: { $gte: item.quantity },
        },
        {
          $inc: { reservedQuantity: -item.quantity },
        }
      );
    } catch (error) {
      console.error(
        `[releaseInventoryReservation] Error releasing item:`,
        error
      );
    }
  }

  console.log(
    `[releaseInventoryReservation] Released reservation cho order ${orderId}`
  );
};

/**
 * TRỪ KHO CHO TOÀN BỘ ĐÔN HÀNG
 * - Validate payment method (COD hoặc VNPAY đã thanh toán)
 * - Pre-validate tất cả items có đủ hàng
 * - Trừ kho từng item với rollback tự động nếu fail
 * - Release reservation sau khi trừ kho thành công
 *
 * Use case: Gán shipper cho đơn hàng (shipper.service.js)
 *
 * @param {Order} order - Order document (đã populate orderItems.variant)
 * @param {ObjectId} performedBy - User ID thực hiện
 * @returns {Object} { success: true, deductedItems: [...] }
 * @throws {ApiError} Nếu không đủ hàng hoặc payment chưa xác nhận
 */
const deductInventoryForOrder = async (order, performedBy) => {
  // 1. Kiểm tra đã trừ kho chưa
  if (order.inventoryDeducted) {
    throw new ApiError(400, "Kho đã được trừ cho đơn hàng này rồi");
  }

  // 2. Validate payment method - FIXED: Dùng payment.method thay vì payment.paymentMethod
  const shouldDeduct =
    order.payment.method === "COD" ||
    (order.payment.method === "VNPAY" &&
      order.payment.paymentStatus === "paid");

  if (!shouldDeduct) {
    throw new ApiError(
      400,
      "Không thể trừ kho cho đơn VNPAY chưa thanh toán. Vui lòng chờ khách hàng thanh toán."
    );
  }

  // 3. Pre-validate TẤT CẢ items có đủ hàng TRƯỚC KHI trừ
  for (const item of order.orderItems) {
    const productId = item.variant?.product?._id || item.variant?.product;

    if (!productId) {
      throw new ApiError(
        400,
        `Không tìm thấy product từ variant ${item.variant?._id}`
      );
    }

    const inventoryItem = await InventoryItem.findOne({
      product: productId,
      variant: item.variant._id,
      size: item.size._id,
    });

    if (!inventoryItem || inventoryItem.quantity < item.quantity) {
      throw new ApiError(
        400,
        `Không đủ hàng trong kho cho "${
          item.productName || "sản phẩm"
        }". Cần: ${item.quantity}, Còn: ${inventoryItem?.quantity || 0}`
      );
    }
  }

  // 4. Trừ kho từng item với rollback tự động
  const deductedItems = [];

  try {
    for (const item of order.orderItems) {
      const productId = item.variant?.product?._id || item.variant?.product;

      await stockOut(
        {
          product: productId,
          variant: item.variant._id,
          size: item.size._id,
          quantity: item.quantity,
          reason: "sale",
          reference: order._id,
          notes: `Trừ kho tự động cho đơn hàng ${order.code}`,
        },
        performedBy
      );

      deductedItems.push(item);
    }

    // FIXED Bug #51: Release reservation sau khi trừ kho thành công
    // Khi tạo order, inventory đã được reserve (reservedQuantity tăng)
    // Sau khi trừ kho (quantity giảm), cần release reservation để availableQuantity đúng
    await releaseInventoryReservation(order.orderItems, order._id);
    console.log(
      `[deductInventoryForOrder] Đã release reservation cho order ${order.code}`
    );

    console.log(
      `[deductInventoryForOrder] Đã trừ kho thành công cho ${deductedItems.length} items của đơn ${order.code}`
    );

    return { success: true, deductedItems };
  } catch (error) {
    // ROLLBACK: Hoàn lại các items đã trừ
    console.error(
      `[deductInventoryForOrder] Lỗi khi trừ kho, rollback ${deductedItems.length} items:`,
      error
    );

    for (const item of deductedItems) {
      try {
        const productId = item.variant?.product?._id || item.variant?.product;

        await stockIn(
          {
            product: productId,
            variant: item.variant._id,
            size: item.size._id,
            quantity: item.quantity,
            costPrice: 0, // Sử dụng averageCostPrice
            reason: "return",
            reference: order._id,
            notes: `[ROLLBACK] Hoàn kho do lỗi trừ kho: ${error.message}`,
          },
          performedBy
        );
      } catch (rollbackError) {
        console.error(
          `[CRITICAL] [deductInventoryForOrder] Rollback FAILED cho item:`,
          rollbackError
        );
      }
    }

    throw new ApiError(500, `Không thể trừ kho: ${error.message}`);
  }
};

/**
 * LẤY PRICING VÀ QUANTITIES CHO TOÀN BỘ VARIANT
 * - Tìm tất cả InventoryItem thuộc variant
 * - Pricing: Lấy từ item đầu tiên (sellingPrice, discountPercent, finalPrice)
 * - Quantities: Array { sizeId, sizeValue, quantity, isAvailable, isLowStock, isOutOfStock }
 *
 * Use case: ProductDetail page - hiển thị giá và size picker
 *
 * @param {ObjectId} variantId - Variant ID
 * @returns {Object} { pricing, quantities, hasInventory }
 */
const getVariantPricing = async (variantId) => {
  const inventoryItems = await InventoryItem.find({
    variant: variantId,
  }).populate("size", "value description");

  if (!inventoryItems || inventoryItems.length === 0) {
    return {
      pricing: {
        sellingPrice: 0,
        discountPercent: 0,
        finalPrice: 0,
        calculatedPrice: 0,
        calculatedPriceFinal: 0,
        percentDiscount: 0,
      },
      quantities: [],
      hasInventory: false,
    };
  }

  const firstItem = inventoryItems[0];
  const pricing = {
    sellingPrice: firstItem.sellingPrice || 0,
    discountPercent: firstItem.discountPercent || 0,
    finalPrice: firstItem.finalPrice || 0,
    calculatedPrice: firstItem.sellingPrice || 0,
    calculatedPriceFinal: firstItem.finalPrice || 0,
    percentDiscount: firstItem.discountPercent || 0,
  };

  const quantities = inventoryItems.map((item) => ({
    sizeId: item.size._id,
    sizeValue: item.size.value || "",
    sizeDescription: item.size.description || "",
    quantity: item.quantity || 0,
    isAvailable: item.quantity > 0,
    isLowStock: item.isLowStock,
    isOutOfStock: item.isOutOfStock,
    sku: item.sku || "",
    // Per-size pricing info from InventoryItem
    sellingPrice: item.sellingPrice || 0,
    finalPrice: item.finalPrice || 0,
    discountPercent: item.discountPercent || 0,
    costPrice: item.averageCostPrice || item.costPrice || 0,
  }));

  return {
    pricing,
    quantities,
    hasInventory: true,
  };
};

module.exports = {
  calculatePrice,
  stockIn,
  stockOut,
  adjustStock,
  getInventoryList,
  getInventoryById,
  updateLowStockThreshold,
  getTransactionHistory,
  getInventoryStats,
  syncInventoryToVariant,
  getOrCreateInventoryItem,
  getVariantSizePricing,
  getVariantPricing,
  getProductPricing,
  updateProductStockFromInventory,
  getProductStockInfo,
  deductInventoryForOrder,
  reserveInventoryForOrder, // NEW: Reserve inventory khi tạo order
  releaseInventoryReservation, // NEW: Release khi cancel order chưa giao
};
