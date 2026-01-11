const { Product, Variant, Category, Brand, Order, Tag } = require("@models");
const mongoose = require("mongoose");
const { createSlug } = require("@utils/slugify");
const paginate = require("@utils/pagination");
const paginateDeleted = require("@utils/paginationDeleted");
const {
  getVietnameseCollation,
  needsVietnameseCollation,
} = require("@utils/collation");
const { updateProductStockInfo } = require("@models/product/middlewares");
const ApiError = require("@utils/ApiError");
const variantService = require("@services/variant.service");

// Hàm hỗ trợ xử lý các case sắp xếp
const getSortOption = (sortParam) => {
  let sortOption = { createdAt: -1 };
  let collation = null;

  if (sortParam) {
    switch (sortParam) {
      case "created_at_asc":
        sortOption = { createdAt: 1 };
        break;
      case "created_at_desc":
        sortOption = { createdAt: -1 };
        break;
      case "name_asc":
        sortOption = { name: 1 };
        collation = getVietnameseCollation();
        break;
      case "name_desc":
        sortOption = { name: -1 };
        collation = getVietnameseCollation();
        break;
      default:
        try {
          sortOption = JSON.parse(sortParam);
          // Kiểm tra nếu sort theo name thì thêm collation
          if (needsVietnameseCollation(JSON.stringify(sortOption))) {
            collation = getVietnameseCollation();
          }
        } catch (err) {
          sortOption = { createdAt: -1 };
        }
        break;
    }
  }

  return { sortOption, collation };
};

/**
 * Helper: Tạo biến thể tóm tắt cho các sản phẩm
 */
const createVariantSummary = (variants) => {
  // Khởi tạo thông tin tóm tắt
  const variantSummary = {
    total: 0,
    active: 0,
    colors: [],
    colorCount: 0,
    sizeCount: 0,
    priceRange: { min: null, max: null, isSinglePrice: true },
    discount: { hasDiscount: false, maxPercent: 0 },
  };

  // Tập hợp để lưu trữ các ID duy nhất
  const colorSet = new Set();
  const sizeSet = new Set();

  // Xử lý thông tin từ variants nếu có
  if (variants && variants.length > 0) {
    variantSummary.total = variants.length;

    // Variables to calculate price range and discount across variants
    let minPrice = null;
    let maxPrice = null;
    let hasDiscount = false;
    let maxDiscountPercent = 0;

    variants.forEach((variant) => {
      // Đếm variants active
      if (variant.isActive) {
        variantSummary.active++;
      }

      // Thu thập thông tin màu sắc
      if (variant.color && variant.color._id) {
        colorSet.add(variant.color._id.toString());
        // Lưu lại thông tin màu để hiển thị
        if (
          !variantSummary.colors.some(
            (c) => c._id?.toString() === variant.color._id.toString()
          )
        ) {
          variantSummary.colors.push({
            _id: variant.color._id,
            name: variant.color.name,
            code: variant.color.code,
            // Map code -> hexCode for FE compatibility. If code is missing (e.g. half type),
            // fallback to first color in colors array when available
            hexCode:
              variant.color.code ||
              (Array.isArray(variant.color.colors) &&
                variant.color.colors[0]) ||
              null,
            type: variant.color.type,
            colors: variant.color.colors || [],
          });
        }
      }

      // Thu thập thông tin kích thước
      if (variant.sizes && Array.isArray(variant.sizes)) {
        variant.sizes.forEach((sizeObj) => {
          if (sizeObj.size && sizeObj.size._id) {
            const sizeId = sizeObj.size._id.toString();
            sizeSet.add(sizeId);
          }
        });
      }

      // REMOVED: variant.priceFinal/price/percentDiscount đã bị xóa khỏi schema
      // Giá được quản lý bởi InventoryItem, try to extract pricing from
      // variant.inventorySummary if available so variantSummary.priceRange can be built
      const pricing = variant.inventorySummary?.pricing || {};
      const vMin =
        pricing.minPrice ??
        pricing.calculatedPrice ??
        pricing.sellingPrice ??
        null;
      const vMax =
        pricing.maxPrice ??
        pricing.calculatedPrice ??
        pricing.finalPrice ??
        null;
      const vPercent = pricing.percentDiscount ?? pricing.discountPercent ?? 0;

      if (vMin !== null && vMin !== undefined) {
        if (minPrice === null || vMin < minPrice) minPrice = vMin;
      }
      if (vMax !== null && vMax !== undefined) {
        if (maxPrice === null || vMax > maxPrice) maxPrice = vMax;
      }
      if (vPercent && vPercent > 0) {
        hasDiscount = true;
        if (vPercent > maxDiscountPercent) maxDiscountPercent = vPercent;
      }

      // Note: If inventory pricing is not populated here, transformProductForPublic
      // or calling code should populate inventory summaries before calling this helper.
    });

    // Cập nhật số lượng màu và kích thước
    variantSummary.colorCount = colorSet.size;
    variantSummary.sizeCount = sizeSet.size;

    // Assign computed priceRange and discount info
    variantSummary.priceRange.min = minPrice;
    variantSummary.priceRange.max = maxPrice;
    variantSummary.priceRange.isSinglePrice =
      minPrice !== null && maxPrice !== null && minPrice === maxPrice;
    variantSummary.discount.hasDiscount = hasDiscount;
    variantSummary.discount.maxPercent = maxDiscountPercent;

    // Kiểm tra xem tất cả các biến thể có cùng mức giá hay không
    variantSummary.priceRange.isSinglePrice =
      variantSummary.priceRange.min === variantSummary.priceRange.max;
  }

  return variantSummary;
};

/**
 * Helper: Chuyển đổi dữ liệu sản phẩm cho Admin
 * - Giữ lại thông tin quản trị
 */
const transformProductForAdmin = (product) => {
  const productObj = product.toObject ? product.toObject() : { ...product };
  return productObj;
};

/**
 * Helper: Chuyển đổi dữ liệu sản phẩm cho Public
 * - Loại bỏ thông tin quản trị nhạy cảm
 *
 * WARNING: This function is SYNCHRONOUS and expects variants to already have
 * inventorySummary populated. Do NOT use this for data from DB queries.
 * Use it only AFTER variants have been processed with await calculateInventorySummary()
 */
const transformProductForPublic = (product) => {
  const productObj = product.toObject ? product.toObject() : { ...product };

  // Loại bỏ thông tin nhạy cảm, chỉ giữ lại những gì cần thiết cho client
  const publicData = {
    _id: productObj._id,
    name: productObj.name,
    slug: productObj.slug,
    description: productObj.description,
    category: productObj.category
      ? {
          _id: productObj.category._id,
          name: productObj.category.name,
        }
      : { _id: "", name: "Chưa phân loại" },
    brand: productObj.brand
      ? {
          _id: productObj.brand._id,
          name: productObj.brand.name,
          logo: productObj.brand.logo,
        }
      : { _id: "", name: "Chưa có thương hiệu" },
    tags: Array.isArray(productObj.tags)
      ? productObj.tags.map((tag) => ({
          _id: tag._id,
          name: tag.name,
          type: tag.type,
          description: tag.description,
        }))
      : [],
    images: Array.isArray(productObj.images) ? productObj.images : [],
    // rating và numReviews sẽ được tính toán hoặc gán từ bên ngoài
    rating: productObj.rating || 0,
    numReviews: productObj.numReviews || 0,
    averageRating: productObj.rating || 0, // Alias for compatibility
    reviewCount: productObj.numReviews || 0, // Alias for compatibility
    // stockStatus và totalQuantity sẽ được tính toán hoặc gán từ bên ngoài
    stockStatus: productObj.stockStatus || "out_of_stock",
    totalQuantity: productObj.totalQuantity || 0,
    isActive: productObj.isActive,
    createdAt: productObj.createdAt,
    isNew: false, // Calculate based on creation date if needed
  };

  // Xử lý variants cho public
  if (productObj.variants && productObj.variants.length > 0) {
    publicData.variants = productObj.variants
      // ✅ FIX: Không filter isActive nữa vì variants đã được filter khi query
      // Filter này có thể loại bỏ variants valid do field isActive bị undefined sau khi map
      // .filter((v) => v.isActive)
      .filter((v) => v.isActive !== false) // Chỉ loại bỏ variants có isActive === false
      .map((variant) => {
        return {
          _id: variant._id,
          color: {
            _id: variant.color?._id,
            name: variant.color?.name,
            code: variant.color?.code,
            type: variant.color?.type,
            colors: variant.color?.colors || [],
          },
          gender: variant.gender,
          images: variant.imagesvariant,
          // inventorySummary REMOVED - thông tin đã có trong variants object và inventoryMatrix
          sizes: variant.sizes?.map((size) => ({
            _id: size._id,
            sizeInfo: size.size
              ? {
                  _id: size.size._id,
                  value: size.size.value,
                  description: size.size.description,
                }
              : null,
            quantity: size.quantity,
            sku: size.sku,
            isAvailable: size.isAvailable, // Fix: was size.isSizeAvailable
            isLowStock: size.isLowStock,
            isOutOfStock: size.isOutOfStock,
          })),
        };
      });

    // FIXED: Tính toán thông tin giá từ inventorySummary thay vì variant fields đã xóa
    const priceInfo = productObj.variants.reduce(
      (info, variant) => {
        // Lấy giá từ inventorySummary (được tính từ InventoryItem)
        const pricing = variant.inventorySummary?.pricing || {};
        const finalPrice = pricing.minPrice || 0;
        const originalPrice = pricing.maxPrice || finalPrice;
        const discount = 0; // Discount được tính trong InventoryItem

        if (!info.minPrice || (finalPrice > 0 && finalPrice < info.minPrice)) {
          info.minPrice = finalPrice;
          info.originalPrice = originalPrice;
          info.discountPercent = discount;
        }

        if (discount > info.maxDiscountPercent) {
          info.maxDiscountPercent = discount;
        }

        return info;
      },
      {
        minPrice: null,
        originalPrice: null,
        discountPercent: 0,
        maxDiscountPercent: 0,
      }
    );

    publicData.price = priceInfo.minPrice || 0;
    publicData.originalPrice = priceInfo.originalPrice || 0;
    publicData.discountPercent = priceInfo.discountPercent || 0;
    publicData.hasDiscount = (priceInfo.discountPercent || 0) > 0;
    publicData.maxDiscountPercent = priceInfo.maxDiscountPercent || 0;
    publicData.salePercentage = priceInfo.maxDiscountPercent || 0; // Alias for compatibility

    // Add priceRange for ProductCard compatibility
    publicData.priceRange = {
      min: priceInfo.minPrice || 0,
      max: Math.max(
        ...productObj.variants.map(
          (v) =>
            v.inventorySummary?.pricing?.maxPrice ||
            v.inventorySummary?.pricing?.minPrice ||
            0
        ),
        priceInfo.minPrice || 0
      ),
      isSinglePrice:
        productObj.variants.length === 1 ||
        productObj.variants.every(
          (v) =>
            (v.inventorySummary?.pricing?.minPrice || 0) ===
            (priceInfo.minPrice || 0)
        ),
    };

    // Tìm ảnh chính - handle cases where images might be undefined
    if (!publicData.images || publicData.images.length === 0) {
      const variantWithImages = productObj.variants.find(
        (v) => v.imagesvariant && v.imagesvariant.length > 0
      );

      if (variantWithImages) {
        const mainImage =
          variantWithImages.imagesvariant.find((img) => img.isMain) ||
          variantWithImages.imagesvariant[0];
        publicData.mainImage = mainImage?.url || "";
      }
    } else {
      const mainImage =
        publicData.images.find((img) => img.isMain) || publicData.images[0];
      publicData.mainImage = mainImage?.url || "";
    }
  } else {
    // No variants case - set default values
    publicData.variants = [];
    publicData.price = 0;
    publicData.originalPrice = 0;
    publicData.discountPercent = 0;
    publicData.hasDiscount = false;
    publicData.maxDiscountPercent = 0;
    publicData.salePercentage = 0;
    publicData.priceRange = {
      min: 0,
      max: 0,
      isSinglePrice: true,
    };
    publicData.mainImage = publicData.images?.[0]?.url || "";
  }

  return publicData;
};

/**
 * Helper: Chuyển đổi dữ liệu sản phẩm cho danh sách public
 * - Loại bỏ chi tiết variants, chỉ giữ thông tin tóm tắt
 */
const transformProductForPublicList = (product) => {
  const publicData = transformProductForPublic(product);

  // Với danh sách, loại bỏ chi tiết variants để giảm kích thước dữ liệu
  if (publicData.variants && publicData.variants.length > 0) {
    // Tạo variantSummary giống như API admin để đồng nhất
    publicData.variantSummary = createVariantSummary(product.variants);

    // Thêm thông tin tổng số lượng tồn kho
    publicData.totalInventory = publicData.variants.reduce((total, variant) => {
      return total + (variant.inventorySummary?.totalQuantity || 0);
    }, 0);

    delete publicData.variants;
  } else {
    // Nếu không có variants, tạo một variantSummary rỗng nhưng đầy đủ cấu trúc
    publicData.variantSummary = {
      total: 0,
      active: 0,
      colors: [],
      colorCount: 0,
      sizeCount: 0,
      priceRange: { min: null, max: null, isSinglePrice: true },
      discount: { hasDiscount: false, maxPercent: 0 },
    };
    publicData.totalInventory = 0;
  }

  return publicData;
};

/**
 * Helper tổng hợp thuộc tính sản phẩm
 * @param {Object} product - Sản phẩm đã được populate các thông tin liên quan
 */
const getProductAttributesHelper = async (product) => {
  // Lấy khoảng giá từ InventoryItem (luôn cần lấy, dù có variant hay không)
  const inventoryService = require("@services/inventory.service");
  const productPricing = await inventoryService.getProductPricing(product._id);

  const basePriceRange = {
    min: productPricing.min || 0,
    max: productPricing.max || 0,
  };

  // Kiểm tra nếu sản phẩm không có variants
  if (!product.variants || product.variants.length === 0) {
    return {
      colors: [],
      sizes: [],
      priceRange: basePriceRange, // FIX: Trả về giá từ InventoryItem thay vì {min:0, max:0}
      genders: [],
      sizesCountByColor: {},
      sizeInventoryByColor: {},
      variantsByColor: {},
      variantsByGender: {},
      inventoryMatrix: {
        colors: [],
        sizes: [],
        genders: [],
        stock: {},
        summary: {
          byGender: {},
          byColor: {},
          bySize: {},
          total: 0,
        },
      },
    };
  }

  // Trích xuất các màu sắc có sẵn cho sản phẩm
  const availableColors = {};
  const availableSizes = {};
  const availableGenders = new Set();
  const sizesCountByColor = {};
  const sizeInventoryByColor = {};
  const variantsByColor = {};
  const variantsByGender = {};
  const variantsByColorAndGender = {};

  // Phân loại variants theo màu sắc và kích thước
  product.variants.forEach((variant) => {
    // Bỏ qua nếu variant không có màu
    if (!variant.color) return;

    const colorId = variant.color._id.toString();
    const gender = variant.gender || "unisex";

    // Thêm gender vào danh sách
    availableGenders.add(gender);

    // Lưu thông tin màu
    if (!availableColors[colorId]) {
      availableColors[colorId] = variant.color;
    }

    // Phân loại variants theo giới tính
    if (!variantsByGender[gender]) {
      variantsByGender[gender] = [];
    }
    variantsByGender[gender].push(variant);

    // Phân loại variants theo màu
    if (!variantsByColor[colorId]) {
      variantsByColor[colorId] = [];
    }
    variantsByColor[colorId].push(variant);

    // Phân loại variants theo màu và giới tính
    const colorGenderKey = `${colorId}-${gender}`;
    if (!variantsByColorAndGender[colorGenderKey]) {
      variantsByColorAndGender[colorGenderKey] = [];
    }
    variantsByColorAndGender[colorGenderKey].push(variant);

    // Đếm số lượng sizes theo màu
    if (!sizesCountByColor[colorId]) {
      sizesCountByColor[colorId] = 0;
    }

    // Khởi tạo size inventory theo màu
    if (!sizeInventoryByColor[colorId]) {
      sizeInventoryByColor[colorId] = {};
    }

    // Lưu thông tin kích thước
    variant.sizes.forEach((sizeItem) => {
      if (sizeItem.size) {
        const sizeId = sizeItem.size._id.toString();

        if (!availableSizes[sizeId]) {
          availableSizes[sizeId] = sizeItem.size;
        }

        // Khởi tạo thông tin inventory cho size này
        if (!sizeInventoryByColor[colorId][sizeId]) {
          sizeInventoryByColor[colorId][sizeId] = {
            sizeId,
            sizeValue: sizeItem.size.value,
            sizeDescription: sizeItem.size.description || "",
            quantity: 0,
            isAvailable: false,
            variantId: variant._id.toString(),
            gender: gender,
          };
        }

        // Tăng số lượng kích thước có sẵn theo màu và cập nhật số lượng
        if (sizeItem.quantity > 0 && sizeItem.isAvailable) {
          // Fix: was sizeItem.isSizeAvailable
          sizesCountByColor[colorId]++;
          sizeInventoryByColor[colorId][sizeId].quantity += sizeItem.quantity;
          sizeInventoryByColor[colorId][sizeId].isAvailable = true;
        }
      }
    });
  });

  // Chuyển đổi dữ liệu sang mảng để trả về
  const colors = Object.values(availableColors);
  const sizes = Object.values(availableSizes);
  const genders = Array.from(availableGenders);

  // ✅ Sử dụng basePriceRange đã tính ở đầu hàm (tránh duplicate API call)
  const priceRange = basePriceRange;

  // Chuyển đổi sizeInventoryByColor từ object sang array
  const formattedSizeInventory = {};
  for (const [colorId, sizeMap] of Object.entries(sizeInventoryByColor)) {
    formattedSizeInventory[colorId] = Object.values(sizeMap);
  }

  // Tạo ma trận tồn kho theo màu, kích thước và giới tính
  const inventoryMatrix = {
    colors: colors.map((color) => ({
      id: color._id.toString(),
      name: color.name,
      code: color.code,
      type: color.type,
      colors: color.colors || [],
    })),
    sizes: sizes.map((size) => ({
      id: size._id.toString(),
      value: size.value,
      description: size.description || "",
    })),
    genders: genders.map((gender) => ({
      id: gender,
      name: gender === "male" ? "Nam" : gender === "female" ? "Nữ" : "Unisex",
    })),
    // Ma trận tồn kho: {gender: {colorId: {sizeId: {quantity, isAvailable, variantId, sku}}}}
    stock: {},
  };

  // Khởi tạo ma trận tồn kho
  genders.forEach((gender) => {
    inventoryMatrix.stock[gender] = {};

    colors.forEach((color) => {
      const colorId = color._id.toString();
      inventoryMatrix.stock[gender][colorId] = {};

      sizes.forEach((size) => {
        const sizeId = size._id.toString();
        // Mặc định số lượng là 0
        inventoryMatrix.stock[gender][colorId][sizeId] = {
          quantity: 0,
          isAvailable: false,
          variantId: null,
          sku: null,
        };
      });
    });
  });

  // Điền thông tin vào ma trận tồn kho
  product.variants.forEach((variant) => {
    if (!variant.color) return;

    const colorId = variant.color._id.toString();
    const gender = variant.gender || "unisex";
    const variantId = variant._id.toString();

    variant.sizes.forEach((sizeItem) => {
      if (!sizeItem.size) return;

      const sizeId = sizeItem.size._id.toString();
      const quantity = sizeItem.quantity || 0;
      const isAvailable = quantity > 0 && sizeItem.isAvailable; // Fix: was sizeItem.isSizeAvailable

      if (
        inventoryMatrix.stock[gender] &&
        inventoryMatrix.stock[gender][colorId] &&
        inventoryMatrix.stock[gender][colorId][sizeId]
      ) {
        inventoryMatrix.stock[gender][colorId][sizeId] = {
          quantity: quantity,
          isAvailable: isAvailable,
          variantId: variantId,
          sku: sizeItem.sku || null,
        };
      }
    });
  });

  // Thêm thông tin tổng hợp tồn kho với populated data
  inventoryMatrix.summary = {
    byGender: [],
    byColor: [],
    bySize: [],
    total: 0,
  };

  // Temporary maps để tính toán quantities
  const genderQuantities = {};
  const colorQuantities = {};
  const sizeQuantities = {};

  // Tính tổng số lượng tồn kho theo giới tính
  genders.forEach((gender) => {
    genderQuantities[gender] = 0;

    colors.forEach((color) => {
      const colorId = color._id.toString();

      sizes.forEach((size) => {
        const sizeId = size._id.toString();
        const quantity =
          inventoryMatrix.stock[gender][colorId][sizeId].quantity;

        // Cộng dồn tổng số lượng
        genderQuantities[gender] += quantity;
        inventoryMatrix.summary.total += quantity;

        // Tính tổng số lượng theo màu
        if (!colorQuantities[colorId]) {
          colorQuantities[colorId] = 0;
        }
        colorQuantities[colorId] += quantity;

        // Tính tổng số lượng theo kích thước
        if (!sizeQuantities[sizeId]) {
          sizeQuantities[sizeId] = 0;
        }
        sizeQuantities[sizeId] += quantity;
      });
    });
  });

  // ✅ Populate summary với objects thay vì chỉ có IDs
  inventoryMatrix.summary.byGender = genders.map((gender) => ({
    id: gender,
    name: gender === "male" ? "Nam" : gender === "female" ? "Nữ" : "Unisex",
    quantity: genderQuantities[gender] || 0,
  }));

  inventoryMatrix.summary.byColor = colors.map((color) => ({
    id: color._id.toString(),
    name: color.name,
    code: color.code,
    type: color.type,
    colors: color.colors,
    quantity: colorQuantities[color._id.toString()] || 0,
  }));

  inventoryMatrix.summary.bySize = sizes.map((size) => ({
    id: size._id.toString(),
    value: size.value,
    description: size.description,
    quantity: sizeQuantities[size._id.toString()] || 0,
  }));

  return {
    colors,
    sizes,
    priceRange,
    genders: genders.map((gender) => ({
      id: gender,
      name: gender === "male" ? "Nam" : gender === "female" ? "Nữ" : "Unisex",
    })),
    sizesCountByColor,
    sizeInventoryByColor: formattedSizeInventory,
    variantsByColor,
    variantsByGender,
    inventoryMatrix, // Ma trận tồn kho mới
  };
};

const productService = {
  // === ADMIN API METHODS ===

  /**
   * [ADMIN] Lấy danh sách sản phẩm (có phân trang, filter) kèm thông tin tóm tắt về variants
   * @param {Object} query Tham số truy vấn
   */
  getAdminProducts: async (query) => {
    const {
      page = 1,
      limit = 50,
      name,
      search, // FE gửi param search thay vì name
      category,
      brand,
      stockStatus,
      isActive,
      sort,
    } = query;

    const filter = { deletedAt: null }; // Mặc định chỉ lấy chưa xóa
    // Lọc theo tên (hỗ trợ cả name và search param)
    const searchTerm = name || search;
    if (searchTerm) {
      filter.name = { $regex: searchTerm, $options: "i" };
    }
    // Lọc theo danh mục
    if (category) {
      filter.category = mongoose.Types.ObjectId.isValid(category)
        ? new mongoose.Types.ObjectId(String(category))
        : null;
    }

    // Lọc theo thương hiệu
    if (brand) {
      filter.brand = mongoose.Types.ObjectId.isValid(brand)
        ? new mongoose.Types.ObjectId(String(brand))
        : null;
    }

    // Không lọc theo stockStatus tại query level nữa vì field không còn
    // Sẽ lọc sau khi tính toán

    // Lọc theo trạng thái active
    if (isActive !== undefined) {
      filter.isActive = isActive === "true" || isActive === true;
    }

    const { sortOption, collation } = sort
      ? getSortOption(sort)
      : { sortOption: { createdAt: -1 }, collation: null };

    const options = {
      page,
      limit,
      sort: sortOption,
      collation: collation,
      populate: [
        { path: "category", select: "name" },
        { path: "brand", select: "name logo" },
        { path: "tags", select: "name type description" },
        // REMOVED: Không populate variants từ Product.variants[] vì array có thể rỗng
        // Sẽ query Variant collection trực tiếp bằng product._id
      ],
    };

    // Lấy kết quả từ database
    const results = await paginate(Product, filter, options);

    // Lấy thông tin tồn kho cho từng sản phẩm
    const inventoryService = require("@services/inventory.service");
    const variantService = require("@services/variant.service");

    const productsWithStock = await Promise.all(
      results.data.map(async (product) => {
        const productObj = product.toObject
          ? product.toObject()
          : { ...product };

        // FIX: Query Variant collection trực tiếp thay vì dùng Product.variants[]
        const variants = await Variant.find({
          product: product._id,
          deletedAt: null,
        })
          .populate("color", "name code type colors")
          .populate("sizes.size", "value type")
          .lean();

        productObj.variants = variants;

        // Tính toán stock info động
        const stockInfo = await inventoryService.getProductStockInfo(
          product._id
        );
        productObj.totalQuantity = stockInfo.totalQuantity;
        productObj.stockStatus = stockInfo.stockStatus;

        // Tính toán rating info động
        const reviewService = require("@services/review.service");
        const ratingInfo = await reviewService.getProductRatingInfo(
          product._id
        );
        productObj.rating = ratingInfo.rating;
        productObj.numReviews = ratingInfo.numReviews;

        // ✅ BUG #47 FIX: Tính inventorySummary cho mỗi variant trước khi tạo variantSummary
        if (productObj.variants && productObj.variants.length > 0) {
          productObj.variants = await Promise.all(
            productObj.variants.map(async (variant) => {
              const inventorySummary =
                await variantService.calculateInventorySummary(variant);
              return {
                ...variant,
                inventorySummary,
              };
            })
          );
        }

        // Thêm thông tin tóm tắt về variants
        productObj.variantSummary = createVariantSummary(productObj.variants);

        // Xóa chi tiết variants để giảm dung lượng dữ liệu
        delete productObj.variants;

        return productObj;
      })
    );

    // Lọc theo stockStatus nếu có (sau khi tính toán)
    let filteredData = productsWithStock;
    if (stockStatus) {
      filteredData = productsWithStock.filter(
        (p) => p.stockStatus === stockStatus
      );
    }

    return {
      ...results,
      data: filteredData,
      count: filteredData.length,
    };
  },

  /**
   * [ADMIN] Lấy chi tiết sản phẩm theo ID (kèm variants kể cả đã xóa)
   * Bao gồm thông tin inventory: số lượng, giá vốn, giá bán, giảm giá, lợi nhuận cho từng size
   * @param {String} id ID của sản phẩm
   */
  getAdminProductById: async (id) => {
    const { InventoryItem } = require("../models");

    // Đầu tiên tìm sản phẩm, bao gồm cả đã xóa mềm
    const product = await Product.findById(id)
      .populate("category", "name")
      .populate("brand", "name logo")
      .populate("tags", "name type description")
      .populate("deletedBy", "name email")
      .setOptions({ includeDeleted: true });

    if (!product) {
      throw new ApiError(404, "Không tìm thấy sản phẩm");
    }

    // Tìm tất cả variants của sản phẩm này, bao gồm cả đã xóa
    const variants = await Variant.find({ product: id })
      .populate("color", "name type code colors")
      .populate("sizes.size", "value type description")
      .populate("deletedBy", "firstName lastName email")
      .setOptions({ includeDeleted: true });

    // Lấy tất cả InventoryItem của product này để tính toán inventory info
    const inventoryItems = await InventoryItem.find({ product: id });
    const inventoryMap = new Map();
    inventoryItems.forEach((item) => {
      const key = `${item.variant}_${item.size}`;
      inventoryMap.set(key, item);
    });

    // Gán variants vào product và tính toán inventory cho từng variant
    const variantsWithInventory = await Promise.all(
      variants.map(async (variant) => {
        const variantDoc = variant._doc || variant;
        let variantTotalQuantity = 0;
        let variantTotalValue = 0;

        // Tính inventory cho từng size
        const sizesWithInventory = (variantDoc.sizes || []).map((sizeObj) => {
          const sizeId = sizeObj.size?._id || sizeObj.size;
          const key = `${variant._id}_${sizeId}`;
          const invItem = inventoryMap.get(key);

          const quantity = invItem?.quantity || 0;
          const costPrice =
            invItem?.averageCostPrice || invItem?.costPrice || 0;
          const sellingPrice = invItem?.sellingPrice || 0;
          const finalPrice = invItem?.finalPrice || sellingPrice;
          const discountPercent = invItem?.discountPercent || 0;
          const profitPerItem = finalPrice > 0 ? finalPrice - costPrice : 0;

          variantTotalQuantity += quantity;
          variantTotalValue += costPrice * quantity;

          return {
            ...sizeObj._doc,
            inventory: {
              quantity,
              costPrice,
              sellingPrice,
              finalPrice,
              discountPercent,
              profitPerItem,
              totalValue: costPrice * quantity,
            },
          };
        });

        // Tính giá trung bình cho variant
        const avgCostPrice =
          variantTotalQuantity > 0
            ? Math.round(variantTotalValue / variantTotalQuantity)
            : 0;

        // Lấy giá bán từ inventory item đầu tiên có giá
        const firstInvWithPrice = inventoryItems.find(
          (inv) =>
            inv.variant.toString() === variant._id.toString() &&
            inv.finalPrice > 0
        );

        return {
          ...variantDoc,
          sizes: sizesWithInventory,
          inventorySummary: {
            totalQuantity: variantTotalQuantity,
            totalValue: variantTotalValue,
            avgCostPrice,
            sellingPrice: firstInvWithPrice?.sellingPrice || 0,
            finalPrice: firstInvWithPrice?.finalPrice || 0,
            discountPercent: firstInvWithPrice?.discountPercent || 0,
          },
        };
      })
    );

    // Gán variants đã có inventory vào product
    product.variants = variantsWithInventory;

    // Tạo thống kê về variants
    const variantStats = {
      total: variants.length,
      active: 0,
      inactive: 0,
      deleted: 0,
    };

    // Thống kê theo trạng thái
    variants.forEach((variant) => {
      if (variant.deletedAt) {
        variantStats.deleted++;

        // Thêm thông tin người xóa
        if (variant.deletedBy) {
          variant._doc.deletedByInfo = {
            name: variant.deletedBy.name,
            email: variant.deletedBy.email,
          };
        }
      } else if (variant.isActive) {
        variantStats.active++;
      } else {
        variantStats.inactive++;
      }
    });

    // Chuyển đổi product và thêm thống kê
    const productData = transformProductForAdmin(product);
    productData.variantStats = variantStats;
    productData.variants = variantsWithInventory;

    // Thêm trạng thái xóa
    productData.isDeleted = !!product.deletedAt;

    return {
      success: true,
      product: productData,
    };
  },

  /**
   * [ADMIN] Lấy danh sách sản phẩm đã xóa
   * @param {Object} query Tham số truy vấn
   */
  getDeletedProducts: async (query) => {
    const { page = 1, limit = 10, name, category, brand, sort } = query;

    const filter = {};

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    if (category) {
      filter.category = mongoose.Types.ObjectId.isValid(category)
        ? new mongoose.Types.ObjectId(String(category))
        : null;
    }

    if (brand) {
      filter.brand = mongoose.Types.ObjectId.isValid(brand)
        ? new mongoose.Types.ObjectId(String(brand))
        : null;
    }

    const { sortOption, collation } = sort
      ? getSortOption(sort)
      : { sortOption: { deletedAt: -1 }, collation: null };

    const options = {
      page,
      limit,
      sort: sortOption,
      collation: collation,
      populate: [
        { path: "category", select: "name" },
        { path: "brand", select: "name logo" },
        { path: "deletedBy", select: "firstName lastName email" },
      ],
    };

    const results = await paginateDeleted(Product, filter, options);

    // Import services để tính toán thông tin tồn kho và giá
    const inventoryService = require("@services/inventory.service");
    const variantService = require("@services/variant.service");

    // Xử lý thông tin tóm tắt cho các sản phẩm đã xóa - giống getAdminProducts
    results.data = await Promise.all(
      results.data.map(async (product) => {
        const productObj = product.toObject
          ? product.toObject()
          : { ...product };

        // Thêm thông tin về người xóa nếu có
        if (productObj.deletedBy) {
          productObj.deletedByName = `${productObj.deletedBy.firstName || ""} ${
            productObj.deletedBy.lastName || ""
          }`.trim();
          productObj.deletedByEmail = productObj.deletedBy.email;
        }

        // Query Variant collection bao gồm cả variants đã xóa
        const variants = await Variant.find({ product: product._id })
          .populate("color", "name code type colors")
          .populate("sizes.size", "value type description")
          .setOptions({ includeDeleted: true })
          .lean();

        productObj.variants = variants;

        // Tính toán stock info động (nếu còn inventory)
        const stockInfo = await inventoryService.getProductStockInfo(
          product._id
        );
        productObj.totalQuantity = stockInfo.totalQuantity;
        productObj.stockStatus = stockInfo.stockStatus;

        // Tính toán rating info động
        const reviewService = require("@services/review.service");
        const ratingInfo = await reviewService.getProductRatingInfo(
          product._id
        );
        productObj.rating = ratingInfo.rating;
        productObj.numReviews = ratingInfo.numReviews;

        // Tính inventorySummary cho mỗi variant
        if (productObj.variants && productObj.variants.length > 0) {
          productObj.variants = await Promise.all(
            productObj.variants.map(async (variant) => {
              const inventorySummary =
                await variantService.calculateInventorySummary(variant);
              return {
                ...variant,
                inventorySummary,
              };
            })
          );
        }

        // Thêm thông tin tóm tắt về variants (bao gồm priceRange)
        productObj.variantSummary = createVariantSummary(productObj.variants);

        // Xóa chi tiết variants để giảm dung lượng dữ liệu
        delete productObj.variants;

        return productObj;
      })
    );

    return results;
  },

  /**
   * Tạo sản phẩm mới
   * @param {Object} productData Thông tin sản phẩm
   */
  createProduct: async (productData) => {
    // Kiểm tra category và brand tồn tại
    const categoryExists = await Category.findById(productData.category);
    if (!categoryExists) {
      throw new ApiError(404, `Danh mục ${productData.category} không tồn tại`);
    }

    const brandExists = await Brand.findById(productData.brand);
    if (!brandExists) {
      throw new ApiError(404, `Thương hiệu ${productData.brand} không tồn tại`);
    }

    // Kiểm tra tags tồn tại (nếu có)
    if (productData.tags && Array.isArray(productData.tags)) {
      for (const tagId of productData.tags) {
        const tagExists = await Tag.findById(tagId);
        if (!tagExists) {
          throw new ApiError(404, `Tag ${tagId} không tồn tại`);
        }
      }
    }

    // Tạo slug từ tên sản phẩm (để kiểm tra trùng lặp)
    const potentialSlug = createSlug(productData.name);

    // Kiểm tra sản phẩm trùng lặp (bao gồm cả sản phẩm đã bị xóa mềm)
    const duplicateActiveProduct = await Product.findOne({
      name: productData.name,
      category: productData.category,
      brand: productData.brand,
      deletedAt: null,
    });

    if (duplicateActiveProduct) {
      throw new ApiError(
        409,
        `Đã tồn tại sản phẩm "${productData.name}" với thông tin này trong dữ liệu`
      );
    }

    // Kiểm tra slug bị trùng với sản phẩm đã bị xóa mềm
    const slugExists = await Product.findOne({
      slug: potentialSlug,
      deletedAt: { $ne: null },
    }).setOptions({ includeDeleted: true });

    if (slugExists) {
      throw new ApiError(
        409,
        `Không thể tạo sản phẩm với tên này vì trùng với sản phẩm đã xóa mềm "${slugExists.name}". Vui lòng sử dụng tên khác hoặc khôi phục sản phẩm đã xóa.`
      );
    }

    // Tạo sản phẩm mới
    const product = new Product({
      name: productData.name,
      description: productData.description,
      category: productData.category,
      brand: productData.brand,
      tags: productData.tags || [],
      isActive:
        productData.isActive !== undefined ? productData.isActive : true,
    });

    // Lưu sản phẩm - các middleware sẽ tự động tạo slug
    await product.save();

    return {
      success: true,
      message: "Tạo sản phẩm thành công",
      product: transformProductForAdmin(product),
    };
  },

  /**
   * Cập nhật thông tin sản phẩm
   * @param {String} id ID sản phẩm
   * @param {Object} updateData Dữ liệu cập nhật
   */
  updateProduct: async (id, updateData) => {
    const product = await Product.findById(id);
    if (!product) {
      throw new ApiError(404, `Không tìm thấy sản phẩm với ID: ${id}`);
    }

    // Kiểm tra nếu cập nhật category
    if (updateData.category) {
      const categoryExists = await Category.findById(updateData.category);
      if (!categoryExists) {
        throw new ApiError(
          404,
          `Danh mục ${updateData.category} không tồn tại`
        );
      }
    }

    // Kiểm tra nếu cập nhật brand
    if (updateData.brand) {
      const brandExists = await Brand.findById(updateData.brand);
      if (!brandExists) {
        throw new ApiError(
          404,
          `Thương hiệu ${updateData.brand} không tồn tại`
        );
      }
    }

    // Kiểm tra nếu cập nhật tags
    if (updateData.tags && Array.isArray(updateData.tags)) {
      for (const tagId of updateData.tags) {
        const tagExists = await Tag.findById(tagId);
        if (!tagExists) {
          throw new ApiError(404, `Tag ${tagId} không tồn tại`);
        }
      }
    }

    // Nếu đang cập nhật tên (sẽ ảnh hưởng đến slug)
    if (updateData.name && updateData.name !== product.name) {
      const potentialSlug = createSlug(updateData.name);

      // Kiểm tra slug bị trùng với bất kỳ sản phẩm nào (kể cả đã xóa mềm)
      const slugExists = await Product.findOne({
        slug: potentialSlug,
        _id: { $ne: id },
      }).setOptions({ includeDeleted: true });

      if (slugExists) {
        throw new ApiError(
          409,
          `Không thể đổi tên sản phẩm thành "${updateData.name}" vì sẽ tạo ra slug trùng với sản phẩm "${slugExists._id}"`
        );
      }
    }

    // Cập nhật các trường
    const allowedFields = [
      "name",
      "description",
      "category",
      "brand",
      "tags",
      "isActive",
    ];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        product[key] = value;
      }
    }

    // Lưu sản phẩm - các middleware sẽ cập nhật slug nếu tên thay đổi
    await product.save();

    return {
      success: true,
      message: `Cập nhật sản phẩm với ID: ${product._id} thành công`,
      product: transformProductForAdmin(product),
    };
  },

  /**
   * Xóa sản phẩm hoặc vô hiệu hóa nếu liên quan đến đơn hàng
   * @param {String} id ID sản phẩm
   * @param {String} userId ID người thực hiện
   */
  deleteProduct: async (id, userId) => {
    const product = await Product.findById(id);
    if (!product) {
      throw new ApiError(404, `Không tìm thấy sản phẩm với ID: ${id}`);
    }

    // Kiểm tra xem sản phẩm có đang được sử dụng trong bất kỳ đơn hàng nào
    // Cần join qua variant vì orderItems không có trực tiếp product field
    const hasOrderItems = await Order.aggregate([
      { $unwind: "$orderItems" },
      {
        $lookup: {
          from: "variants",
          localField: "orderItems.variant",
          foreignField: "_id",
          as: "variantData",
        },
      },
      { $unwind: "$variantData" },
      { $match: { "variantData.product": new mongoose.Types.ObjectId(id) } },
      { $limit: 1 },
    ]);

    // Nếu có đơn hàng liên quan, chỉ vô hiệu hóa sản phẩm và các biến thể thay vì xóa
    if (hasOrderItems.length > 0) {
      // Vô hiệu hóa sản phẩm và các biến thể
      product.isActive = false;
      await product.save();
      await Variant.updateMany({ product: id }, { $set: { isActive: false } });

      return {
        success: true,
        message: `Sản phẩm với ID: ${product._id} đang được sử dụng trong đơn hàng nên đã được vô hiệu hóa`,
        isDeactivated: true,
      };
    }

    // Soft delete sản phẩm sử dụng plugin softDelete
    await product.softDelete(userId);

    // Vô hiệu hóa các variant liên quan thay vì xóa mềm
    await Variant.updateMany({ product: id }, { $set: { isActive: false } });

    return {
      success: true,
      message: `Xóa sản phẩm ID: ${product._id} thành công`,
      isDeleted: true,
    };
  },

  /**
   * Khôi phục sản phẩm đã xóa - với hỗ trợ khôi phục cascade
   * @param {String} id ID sản phẩm
   * @param {Boolean} restoreVariants Có khôi phục các variant không
   */
  restoreProduct: async (id, restoreVariants = true) => {
    // Khôi phục sản phẩm - middleware sẽ kiểm tra slug trùng lặp và tạo slug mới nếu cần
    const product = await Product.restoreById(id);
    if (!product) {
      throw new ApiError(
        404,
        `Không tìm thấy sản phẩm với ID: ${id} để khôi phục`
      );
    }

    // Kích hoạt trạng thái sản phẩm
    product.isActive = true;
    await product.save();

    let restoredVariants = 0;

    // CASCADE RESTORE: Khôi phục các biến thể liên quan
    if (restoreVariants) {
      // Lấy danh sách các biến thể đã xóa của sản phẩm này
      const deletedVariants = await Variant.find({
        product: id,
        deletedAt: { $ne: null },
      }).setOptions({ includeDeleted: true });

      // Khôi phục từng biến thể
      for (const variant of deletedVariants) {
        try {
          // Kiểm tra xem có biến thể trùng màu không
          const existingVariant = await Variant.findOne({
            product: id,
            color: variant.color,
            _id: { $ne: variant._id },
            deletedAt: null,
          });

          if (!existingVariant) {
            await Variant.findByIdAndUpdate(variant._id, {
              $set: {
                deletedAt: null,
                isActive: true,
              },
            });
            restoredVariants++;
          }
        } catch (error) {
          console.error(
            `Không thể khôi phục biến thể ${variant._id}:`,
            error.message
          );
        }
      }

      // Cập nhật thông tin tồn kho
      await updateProductStockInfo(product);
    }

    return {
      success: true,
      message: restoreVariants
        ? `Khôi phục sản phẩm thành công. Đã khôi phục ${restoredVariants} biến thể liên quan.`
        : "Khôi phục sản phẩm thành công mà không khôi phục các biến thể.",
      product: transformProductForAdmin(product),
      restoredVariants,
    };
  },

  /**
   * Cập nhật trạng thái active của sản phẩm
   * @param {String} id ID sản phẩm
   * @param {Boolean} isActive Trạng thái active
   * @param {Boolean} cascade Cập nhật cả variants
   */
  updateProductStatus: async (id, isActive, cascade = true) => {
    const product = await Product.findById(id);
    if (!product) {
      throw new ApiError(404, `Không tìm thấy sản phẩm với ID: ${id}`);
    }

    // Cập nhật trạng thái product
    product.isActive = isActive;
    await product.save();

    let affectedVariants = 0;

    // CASCADE: Chỉ cập nhật variants khi cascade = true
    if (cascade && product.variants?.length > 0) {
      const result = await Variant.updateMany(
        { product: id, deletedAt: null },
        { $set: { isActive: isActive } }
      );
      affectedVariants = result.modifiedCount;
    }

    const statusMsg = isActive ? "kích hoạt" : "vô hiệu hóa";
    return {
      success: true,
      message: cascade
        ? `Sản phẩm đã được ${statusMsg}. Đã ${statusMsg} ${affectedVariants} biến thể liên quan.`
        : `Sản phẩm đã được ${statusMsg} mà không ảnh hưởng đến biến thể.`,
      product: transformProductForAdmin(product),
    };
  },

  /**
   * Cập nhật trạng thái tồn kho của sản phẩm
   * @param {string} id - ID sản phẩm cần cập nhật
   * @returns {Promise<Object>} - Thông tin sản phẩm đã cập nhật
   */
  updateProductStockStatus: async (id) => {
    // Tìm sản phẩm với variants đã populate
    const product = await Product.findById(id).populate({
      path: "variants",
      select: "sizes",
      match: { deletedAt: null, isActive: true },
    });

    if (!product) {
      throw new ApiError(404, `Không tìm thấy sản phẩm với ID: ${id}`);
    }

    // Cập nhật thông tin tồn kho sử dụng hàm từ middleware
    await updateProductStockInfo(product);

    // Lấy sản phẩm đã cập nhật
    const updatedProduct = await Product.findById(id);
    return {
      success: true,
      message: `Cập nhật trạng thái tồn kho sản phẩm với ID: ${updatedProduct._id} thành công`,
      product: transformProductForAdmin(updatedProduct),
    };
  },

  // === PUBLIC API METHODS ===
  /**
   * [PUBLIC] Lấy danh sách sản phẩm (có phân trang, filter) với thông tin tóm tắt
   * @param {Object} query Tham số truy vấn
   * @return {Promise<Object>} Kết quả phân trang
   */
  getPublicProducts: async (query) => {
    const {
      page = 1,
      limit = 18,
      name,
      category,
      brand,
      minPrice,
      maxPrice,
      colors,
      sizes,
      gender,
      sort = "newest",
    } = query;

    // Chuyển đổi page và limit sang số
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 18;

    // Bắt đầu xây dựng pipeline aggregation
    const pipeline = [];

    // Stage 0: Lookup category và brand để tìm kiếm theo tên
    pipeline.push(
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brandInfo",
        },
      },
      { $unwind: { path: "$brandInfo", preserveNullAndEmptyArrays: true } }
    );

    // Stage 1: Lọc sản phẩm cơ bản
    const matchStage = {
      isActive: true,
      deletedAt: null,
    };

    // Tìm kiếm theo từ khóa: khớp với tên sản phẩm HOẶC tên danh mục HOẶC tên thương hiệu
    if (name) {
      matchStage.$or = [
        { name: { $regex: name, $options: "i" } },
        { "categoryInfo.name": { $regex: name, $options: "i" } },
        { "brandInfo.name": { $regex: name, $options: "i" } },
      ];
    }

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      matchStage.category = new mongoose.Types.ObjectId(String(category));
    }

    if (brand && mongoose.Types.ObjectId.isValid(brand)) {
      matchStage.brand = new mongoose.Types.ObjectId(String(brand));
    }

    pipeline.push({ $match: matchStage });

    // Stage 2: Lookup variants và chỉ lấy các variants active
    pipeline.push({
      $lookup: {
        from: "variants",
        let: { productId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$product", "$$productId"] },
              isActive: true,
              deletedAt: null,
            },
          },
        ],
        as: "activeVariants",
      },
    });

    // Stage 3: Filter theo các điều kiện variant (lọc nâng cao - KHÔNG bao gồm giá)
    // NOTE: Lọc giá được xử lý riêng ở Stage 7 sau khi đã lookup InventoryItem
    if (colors || sizes || gender) {
      let variantMatch = { $and: [] };

      // REMOVED: Lọc theo giá không còn ở đây nữa
      // Price filtering được xử lý ở Stage 7 thông qua InventoryItem.finalPrice

      // Lọc theo màu
      if (colors) {
        const colorIds = colors
          .split(",")
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id));
        if (colorIds.length > 0) {
          variantMatch.$and.push({ color: { $in: colorIds } });
        }
      }

      // Lọc theo size
      if (sizes) {
        const sizeIds = sizes
          .split(",")
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id));
        if (sizeIds.length > 0) {
          variantMatch.$and.push({ "sizes.size": { $in: sizeIds } });
        }
      }

      // Lọc theo gender - khi chọn male hoặc female thì cũng lấy cả unisex
      if (gender && ["male", "female", "unisex"].includes(gender)) {
        if (gender === "unisex") {
          variantMatch.$and.push({ gender: "unisex" });
        } else {
          // male hoặc female: lấy cả unisex
          variantMatch.$and.push({ gender: { $in: [gender, "unisex"] } });
        }
      }

      // Thêm pipeline lọc biến thể
      if (variantMatch.$and.length > 0) {
        pipeline.push({
          $addFields: {
            filteredVariants: {
              $filter: {
                input: "$activeVariants",
                as: "variant",
                cond: {
                  $and: variantMatch.$and.map((condition) => {
                    // Chuyển đổi điều kiện cho $filter
                    return Object.entries(condition).reduce(
                      (result, [key, value]) => {
                        if (key === "color") {
                          result = {
                            ...result,
                            $in: ["$$variant.color", value.$in],
                          };
                        } else if (key === "sizes.size") {
                          // Đối với sizes cần logic khác
                          result = {
                            $gt: [
                              {
                                $size: {
                                  $filter: {
                                    input: "$$variant.sizes",
                                    as: "size",
                                    cond: { $in: ["$$size.size", value.$in] },
                                  },
                                },
                              },
                              0,
                            ],
                          };
                        } else if (key === "gender" && value.$in) {
                          // Gender với $in (male/female + unisex)
                          result = {
                            ...result,
                            $in: ["$$variant.gender", value.$in],
                          };
                        } else {
                          result = {
                            ...result,
                            $eq: ["$$variant." + key, value],
                          };
                        }
                        return result;
                      },
                      {}
                    );
                  }),
                },
              },
            },
          },
        });
      } else {
        pipeline.push({
          $addFields: {
            filteredVariants: "$activeVariants",
          },
        });
      }
    } else {
      // Nếu không có lọc nâng cao, tất cả variants đều phù hợp
      pipeline.push({
        $addFields: {
          filteredVariants: "$activeVariants",
        },
      });
    }

    // Stage 4: Chỉ giữ lại sản phẩm có ít nhất 1 variant thỏa mãn điều kiện
    pipeline.push({
      $match: {
        "filteredVariants.0": { $exists: true },
      },
    });

    // Stage 5: Lookup InventoryItem để tính minPrice/maxPrice cho sorting
    pipeline.push({
      $lookup: {
        from: "inventoryitems",
        localField: "_id",
        foreignField: "product",
        as: "inventoryItems",
      },
    });

    // Stage 6: Tính minPrice và maxPrice từ InventoryItem
    pipeline.push({
      $addFields: {
        minPrice: {
          $min: "$inventoryItems.finalPrice",
        },
        maxPrice: {
          $max: "$inventoryItems.finalPrice",
        },
      },
    });

    // Stage 6.5: FIX - Lọc theo khoảng giá sử dụng minPrice/maxPrice từ InventoryItem
    // Sản phẩm phù hợp nếu khoảng giá của nó overlap với khoảng giá filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceMatch = {};
      // Product matches if its price range overlaps with filter range
      // Product minPrice <= filter maxPrice AND Product maxPrice >= filter minPrice
      if (minPrice !== undefined) {
        priceMatch.maxPrice = { $gte: Number(minPrice) };
      }
      if (maxPrice !== undefined) {
        priceMatch.minPrice = { $lte: Number(maxPrice) };
      }
      pipeline.push({ $match: priceMatch });
    }

    // Stage 7: Lookup variants để lấy variantIds cho việc tính rating và totalSold
    pipeline.push({
      $lookup: {
        from: "variants",
        localField: "_id",
        foreignField: "product",
        as: "allVariants",
      },
    });

    // Stage 7.1: Lookup orders đã delivered để tính totalSold và lấy orderItems cho reviews
    pipeline.push({
      $lookup: {
        from: "orders",
        let: { variantIds: "$allVariants._id" },
        pipeline: [
          {
            $match: {
              status: "delivered", // Chỉ tính đơn hàng đã giao thành công
            },
          },
          { $unwind: "$orderItems" },
          {
            $match: {
              $expr: { $in: ["$orderItems.variant", "$$variantIds"] },
            },
          },
          {
            $project: {
              orderItemId: "$orderItems._id",
              quantity: "$orderItems.quantity",
            },
          },
        ],
        as: "orderItemsData",
      },
    });

    // Stage 7.1.5: Tính totalSold (tổng số lượng đã bán từ đơn hàng delivered)
    pipeline.push({
      $addFields: {
        totalSold: {
          $sum: "$orderItemsData.quantity",
        },
      },
    });

    // Stage 7.2: Lookup reviews và tính avgRating, numReviews
    pipeline.push({
      $lookup: {
        from: "reviews",
        let: {
          orderItemIds: {
            $map: {
              input: "$orderItemsData",
              as: "oi",
              in: "$$oi.orderItemId",
            },
          },
        },
        pipeline: [
          {
            $match: {
              $expr: { $in: ["$orderItem", "$$orderItemIds"] },
              isActive: true,
              deletedAt: null,
            },
          },
          {
            $group: {
              _id: null,
              avgRating: { $avg: "$rating" },
              numReviews: { $sum: 1 },
            },
          },
        ],
        as: "reviewStats",
      },
    });

    // Stage 7.3: Thêm fields avgRating và numReviews
    pipeline.push({
      $addFields: {
        avgRating: {
          $ifNull: [{ $arrayElemAt: ["$reviewStats.avgRating", 0] }, 0],
        },
        numReviews: {
          $ifNull: [{ $arrayElemAt: ["$reviewStats.numReviews", 0] }, 0],
        },
      },
    });

    // Stage 8: Project để giữ các trường cần thiết
    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        slug: 1,
        description: 1,
        category: 1,
        brand: 1,
        isActive: 1,
        stockStatus: 1,
        totalQuantity: 1,
        images: 1,
        createdAt: 1,
        filteredVariantsCount: { $size: "$filteredVariants" },
        filteredVariants: 1,
        minPrice: 1,
        maxPrice: 1,
        avgRating: 1,
        numReviews: 1,
        totalSold: 1, // Tổng số lượng đã bán
      },
    });

    // Stage 9: Sắp xếp
    let sortOption = { createdAt: -1 }; // Mặc định theo mới nhất
    switch (sort) {
      case "price-asc":
        sortOption = { minPrice: 1, _id: 1 };
        break;
      case "price-desc":
        sortOption = { maxPrice: -1, _id: 1 };
        break;
      case "popular":
        // FIX: Sắp xếp theo số lượng đã bán (nhiều mua = popular)
        sortOption = { totalSold: -1, avgRating: -1, _id: 1 };
        break;
      case "rating":
        // Sắp xếp theo rating thực từ reviews
        sortOption = { avgRating: -1, numReviews: -1, _id: 1 };
        break;
      default:
        sortOption = { createdAt: -1, _id: 1 };
    }

    pipeline.push({ $sort: sortOption });

    // Tạo pipeline đếm tổng
    const countPipeline = [...pipeline];
    countPipeline.push({ $count: "total" });

    // Thêm phân trang vào pipeline chính
    pipeline.push({ $skip: (pageNum - 1) * limitNum });
    pipeline.push({ $limit: limitNum });

    // Thêm lookup để lấy đầy đủ thông tin
    pipeline.push(
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } }
    );

    // Lookup variants chi tiết cho display
    pipeline.push({
      $lookup: {
        from: "variants",
        let: { productId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$product", "$$productId"] },
              isActive: true,
              deletedAt: null,
            },
          },
          {
            $lookup: {
              from: "colors",
              localField: "color",
              foreignField: "_id",
              as: "color",
            },
          },
          { $unwind: { path: "$color", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "sizes",
              localField: "sizes.size",
              foreignField: "_id",
              as: "allSizes",
            },
          },
          {
            $addFields: {
              sizes: {
                $map: {
                  input: "$sizes",
                  as: "sizeItem",
                  in: {
                    _id: "$$sizeItem._id",
                    size: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$allSizes",
                            as: "s",
                            cond: { $eq: ["$$s._id", "$$sizeItem.size"] },
                          },
                        },
                        0,
                      ],
                    },
                    quantity: "$$sizeItem.quantity",
                    sku: "$$sizeItem.sku",
                    // REMOVED: isSizeAvailable - field không còn tồn tại trong Variant schema
                    // Availability sẽ được tính từ InventoryItem sau aggregation
                  },
                },
              },
            },
          },
          { $project: { allSizes: 0 } },
        ],
        as: "variants",
      },
    });

    // Thực hiện aggregation
    const [countResult, products] = await Promise.all([
      Product.aggregate(countPipeline),
      Product.aggregate(pipeline),
    ]);

    const totalCount = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / limitNum));

    // Chuyển đổi kết quả và tính stock info động
    const inventoryService = require("@services/inventory.service");
    const reviewService = require("@services/review.service");
    const variantService = require("@services/variant.service");
    const transformedData = await Promise.all(
      products.map(async (product) => {
        // Bỏ trường trung gian
        delete product.filteredVariantsCount;
        delete product.filteredVariants;
        delete product.minPrice;
        delete product.maxPrice;

        // Tính stock info động từ InventoryItem
        const stockInfo = await inventoryService.getProductStockInfo(
          product._id
        );
        product.totalQuantity = stockInfo.totalQuantity;
        product.stockStatus = stockInfo.stockStatus;

        // Tính rating info động từ Review
        const ratingInfo = await reviewService.getProductRatingInfo(
          product._id
        );
        // FIXED: Gán vào temporary fields cho transform function (không lưu vào DB)
        const productWithRating = product.toObject
          ? product.toObject()
          : { ...product };
        productWithRating.rating = ratingInfo.rating;
        productWithRating.numReviews = ratingInfo.numReviews;

        // CRITICAL FIX: Tính inventorySummary cho mỗi variant trước khi transform
        if (
          productWithRating.variants &&
          productWithRating.variants.length > 0
        ) {
          productWithRating.variants = await Promise.all(
            productWithRating.variants.map(async (variant) => {
              const inventorySummary =
                await variantService.calculateInventorySummary(variant);
              return {
                ...variant,
                inventorySummary,
              };
            })
          );
        }

        // Sử dụng hàm chuyển đổi hiện có
        return transformProductForPublicList(productWithRating);
      })
    );

    return {
      success: true,
      count: transformedData.length,
      total: totalCount,
      totalPages: totalPages,
      currentPage: pageNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
      data: transformedData,
    };
  },

  /**
   * [HELPER] Lấy chi tiết sản phẩm - Logic chung cho getPublicProductById và getPublicProductBySlug
   * @param {Object} query - Điều kiện tìm kiếm product (có thể là {_id} hoặc {slug})
   * @returns {Promise<Object>} Chi tiết sản phẩm đầy đủ
   */
  _getProductDetailHelper: async (query) => {
    // Tìm product với query điều kiện
    const productRaw = await Product.findOne({
      ...query,
      isActive: true,
      deletedAt: null,
    });

    if (!productRaw) {
      throw new ApiError(404, `Không tìm thấy sản phẩm`);
    }

    // Query variants trực tiếp từ Variant model
    const Variant = require("@models").Variant;
    const activeVariants = await Variant.find({
      product: productRaw._id,
      isActive: true,
      deletedAt: null,
    })
      .populate("color", "name code type colors")
      .populate("sizes.size", "value type description");

    // Populate category, brand, tags
    const product = await Product.findOne({
      ...query,
      isActive: true,
      deletedAt: null,
    }).populate([
      {
        path: "category",
        select: "name slug",
        match: { isActive: true, deletedAt: null },
      },
      {
        path: "brand",
        select: "name logo slug",
        match: { isActive: true, deletedAt: null },
      },
      {
        path: "tags",
        select: "name type description",
        match: { isActive: true, deletedAt: null },
      },
    ]);

    // Gán variants đã query trực tiếp vào product
    product.variants = activeVariants;

    // GET INVENTORY DATA FOR ALL VARIANTS
    const inventoryService = require("@services/inventory.service");
    const inventoryDataPromises = product.variants.map(async (variant) => {
      const pricing = await inventoryService.getVariantPricing(variant._id);
      return {
        variantId: variant._id.toString(),
        pricing: pricing.pricing,
        quantities: pricing.quantities,
        hasInventory: pricing.hasInventory,
      };
    });
    const inventoryData = await Promise.all(inventoryDataPromises);

    // MAP INVENTORY DATA TO VARIANTS - Gán trực tiếp thay vì tạo object mới
    for (let i = 0; i < product.variants.length; i++) {
      const variant = product.variants[i];
      const inventory = inventoryData.find(
        (inv) => inv.variantId === variant._id.toString()
      );

      // Map inventory data INTO existing sizes structure
      variant.sizes.forEach((sizeItem) => {
        const sizeInventory = inventory?.quantities?.find(
          (q) => q.sizeId.toString() === sizeItem.size._id.toString()
        );

        // Gán trực tiếp các field inventory vào sizeItem
        sizeItem.quantity = sizeInventory?.quantity || 0;
        sizeItem.isAvailable = sizeInventory?.isAvailable || false;
        sizeItem.isLowStock = sizeInventory?.isLowStock || false;
        sizeItem.isOutOfStock = sizeInventory?.isOutOfStock !== false;
        if (sizeInventory?.sku) {
          sizeItem.sku = sizeInventory.sku;
        }
      });

      // Gán pricing vào variant
      variant.price = inventory?.pricing?.calculatedPrice || 0;
      variant.priceFinal = inventory?.pricing?.calculatedPriceFinal || 0;
      variant.percentDiscount = inventory?.pricing?.percentDiscount || 0;
    }

    // Tính toán ma trận tồn kho và thông tin cơ bản
    const productAttributes = await getProductAttributesHelper(product);

    // Xử lý thông tin sản phẩm
    const publicProduct = transformProductForPublic(product);

    // BUILD VARIANTS INFO AND IMAGES
    const variantImages = {};
    const variantsInfo = {};

    if (product.variants && product.variants.length > 0) {
      product.variants.forEach((variant) => {
        const colorId = variant.color?._id?.toString();
        const gender = variant.gender;
        const variantId = variant._id.toString();

        if (!colorId) return;

        const key = `${gender}-${colorId}`;

        // Chuẩn bị thông tin sizes với số lượng và giá riêng từng size
        const sizesWithQuantity = variant.sizes.map((size) => {
          // Tìm inventory data cho size này
          const sizeInventory = inventoryData
            .find((inv) => inv.variantId === variant._id.toString())
            ?.quantities?.find(
              (q) => q.sizeId.toString() === size.size?._id?.toString()
            );

          return {
            sizeId: size.size?._id?.toString(),
            sizeValue: size.size?.value,
            sizeType: size.size?.type,
            sizeDescription: size.size?.description,
            quantity: size.quantity,
            sku: size.sku,
            isAvailable: size.isAvailable,
            isLowStock: size.isLowStock,
            isOutOfStock: size.isOutOfStock,
            // Per-size pricing from InventoryItem
            price: sizeInventory?.sellingPrice || variant.price || 0,
            finalPrice: sizeInventory?.finalPrice || variant.priceFinal || 0,
            discountPercent:
              sizeInventory?.discountPercent || variant.percentDiscount || 0,
          };
        });

        // Lưu thông tin biến thể với sizes đầy đủ
        variantsInfo[key] = {
          _id: variantId, // Changed from 'id' to '_id' for FE consistency
          colorId: colorId,
          colorName: variant.color?.name || "",
          colorCode: variant.color?.code,
          colorType: variant.color?.type,
          colors: variant.color?.colors,
          gender: gender,
          sizes: sizesWithQuantity,
          totalQuantity: sizesWithQuantity.reduce(
            (sum, size) => sum + (size.quantity || 0),
            0
          ),
        };

        // Thêm ảnh của biến thể vào collection
        if (variant.imagesvariant && variant.imagesvariant.length > 0) {
          const sortedImages = [...variant.imagesvariant].sort((a, b) => {
            if (a.isMain && !b.isMain) return -1;
            if (!a.isMain && b.isMain) return 1;
            return a.displayOrder - b.displayOrder;
          });

          variantImages[key] = sortedImages.map((img) => ({
            url: img.url,
            public_id: img.public_id,
            isMain: img.isMain,
          }));
        }
      });
    }

    // Fallback: Nếu không có ảnh biến thể, dùng ảnh sản phẩm
    if (
      Object.keys(variantImages).length === 0 &&
      publicProduct.images &&
      publicProduct.images.length > 0
    ) {
      variantImages["default"] = publicProduct.images.map((img) => ({
        url: img.url,
        public_id: img.public_id,
        isMain: img.isMain,
      }));
    }

    // Tính toán stock info động từ InventoryItem
    const stockInfo = await inventoryService.getProductStockInfo(product._id);
    publicProduct.totalQuantity = stockInfo.totalQuantity;
    publicProduct.stockStatus = stockInfo.stockStatus;

    // Tính toán rating info động từ Review
    const reviewService = require("@services/review.service");
    const ratingInfo = await reviewService.getProductRatingInfo(product._id);
    publicProduct.rating = ratingInfo.rating;
    publicProduct.numReviews = ratingInfo.numReviews;

    // SYNC priceRange từ productAttributes vào publicProduct
    if (
      productAttributes.priceRange &&
      productAttributes.priceRange.min > 0 &&
      (!publicProduct.priceRange || publicProduct.priceRange.min === 0)
    ) {
      publicProduct.priceRange = productAttributes.priceRange;
      publicProduct.price = productAttributes.priceRange.min;
      publicProduct.originalPrice = productAttributes.priceRange.max;
    }

    // Lấy thông tin Size Guide (nếu có)
    const SizeGuide = require("@models/sizeGuide");
    const sizeGuide = await SizeGuide.findOne({
      product: product._id,
      isActive: true,
    }).select("sizeChart measurementGuide");

    return {
      success: true,
      product: publicProduct,
      attributes: {
        colors: productAttributes.colors,
        sizes: productAttributes.sizes,
        genders: productAttributes.genders,
        inventoryMatrix: productAttributes.inventoryMatrix,
      },
      images: variantImages,
      variants: variantsInfo,
      sizeGuide: sizeGuide || null,
    };
  },

  /**
   * [PUBLIC] Lấy chi tiết sản phẩm theo ID
   * @param {String} id ID của sản phẩm
   */
  getPublicProductById: async (id) => {
    return await productService._getProductDetailHelper({ _id: id });
  },

  /**
   * [PUBLIC] Lấy chi tiết sản phẩm theo slug
   * @param {String} slug Slug của sản phẩm
   */
  getPublicProductBySlug: async (slug) => {
    return await productService._getProductDetailHelper({ slug });
  },

  /**
   * [PUBLIC] Lấy sản phẩm nổi bật (theo rating cao)
   * @param {Number} limit Số lượng sản phẩm trả về
   */
  getFeaturedProducts: async (limit = 20) => {
    // FIX: Sử dụng $lookup thay vì .populate() vì Product.variants array có thể rỗng
    // Variants được liên kết thông qua Variant.product field, không phải Product.variants array
    const inventoryService = require("@services/inventory.service");
    const reviewService = require("@services/review.service");
    const variantService = require("@services/variant.service");

    // Lấy products cơ bản
    const products = await Product.find({
      isActive: true,
      deletedAt: null,
    })
      .limit(Number(limit) * 3)
      .populate("category", "name")
      .populate("brand", "name logo")
      .populate("tags", "name type description")
      .lean();

    // Lookup variants trực tiếp từ Variant model (giống getPublicProducts)
    const activeVariants = await Variant.find({
      product: { $in: products.map((p) => p._id) },
      isActive: true,
      deletedAt: null,
    })
      .populate("color", "name code type colors")
      .populate("sizes.size", "value type description")
      .lean();

    // Gom variants theo productId
    const variantsByProduct = {};
    activeVariants.forEach((variant) => {
      const productId = variant.product.toString();
      if (!variantsByProduct[productId]) {
        variantsByProduct[productId] = [];
      }
      variantsByProduct[productId].push(variant);
    });

    // Gán variants vào products và filter products có variants
    const productsWithVariants = products
      .map((product) => ({
        ...product,
        variants: variantsByProduct[product._id.toString()] || [],
      }))
      .filter((product) => product.variants.length > 0);

    // Batch load rating info cho tất cả products
    const productIds = productsWithVariants.map((p) => p._id.toString());
    const ratingInfoMap = await reviewService.getBatchProductRatingInfo(
      productIds
    );

    // Transform và enrich products
    const productsWithStockAndRating = await Promise.all(
      productsWithVariants.map(async (product) => {
        const productObj = { ...product };
        const productIdStr = product._id.toString();

        // Tính stock info
        const stockInfo = await inventoryService.getProductStockInfo(
          product._id
        );
        productObj.totalQuantity = stockInfo.totalQuantity;
        productObj.stockStatus = stockInfo.stockStatus;

        // Sử dụng batch-loaded rating info
        const ratingInfo = ratingInfoMap[productIdStr] || {
          rating: 0,
          numReviews: 0,
        };
        productObj.rating = ratingInfo.rating;
        productObj.numReviews = ratingInfo.numReviews;
        productObj.averageRating = ratingInfo.rating;
        productObj.reviewCount = ratingInfo.numReviews;

        // Tính inventorySummary cho mỗi variant
        if (productObj.variants && productObj.variants.length > 0) {
          productObj.variants = await Promise.all(
            productObj.variants.map(async (variant) => {
              const inventorySummary =
                await variantService.calculateInventorySummary(variant);
              return {
                ...variant,
                inventorySummary,
              };
            })
          );
        }

        return transformProductForPublicList(productObj);
      })
    );

    // Sort theo rating cao nhất và giới hạn
    const sortedProducts = productsWithStockAndRating
      .sort((a, b) => {
        // Ưu tiên theo rating, sau đó theo số reviews
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.numReviews - a.numReviews;
      })
      .slice(0, Number(limit));

    return {
      success: true,
      products: sortedProducts,
    };
  },

  /**
   * [PUBLIC] Lấy sản phẩm mới nhất
   * @param {Number} limit Số lượng sản phẩm trả về
   */
  getNewArrivals: async (limit = 20) => {
    // FIX: Sử dụng lookup từ Variant model thay vì .populate() vì Product.variants array có thể rỗng
    const inventoryService = require("@services/inventory.service");
    const reviewService = require("@services/review.service");
    const variantService = require("@services/variant.service");

    // Lấy sản phẩm mới nhất đang active và không bị xóa mềm
    const products = await Product.find({
      isActive: true,
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .limit(Number(limit) * 2)
      .populate("category", "name")
      .populate("brand", "name logo")
      .populate("tags", "name type description")
      .lean();

    // Lookup variants trực tiếp từ Variant model
    const activeVariants = await Variant.find({
      product: { $in: products.map((p) => p._id) },
      isActive: true,
      deletedAt: null,
    })
      .populate("color", "name code type colors")
      .populate("sizes.size", "value type description")
      .lean();

    // Gom variants theo productId
    const variantsByProduct = {};
    activeVariants.forEach((variant) => {
      const productId = variant.product.toString();
      if (!variantsByProduct[productId]) {
        variantsByProduct[productId] = [];
      }
      variantsByProduct[productId].push(variant);
    });

    // Gán variants vào products và filter products có variants
    const productsWithVariants = products
      .map((product) => ({
        ...product,
        variants: variantsByProduct[product._id.toString()] || [],
      }))
      .filter((product) => product.variants.length > 0);

    // Giới hạn số lượng sản phẩm trả về theo limit
    const limitedProducts = productsWithVariants.slice(0, Number(limit));

    // Tính stock info và rating info cho từng sản phẩm
    const productsWithStockAndRating = await Promise.all(
      limitedProducts.map(async (product) => {
        const productObj = { ...product };

        // Tính stock info
        const stockInfo = await inventoryService.getProductStockInfo(
          product._id
        );
        productObj.totalQuantity = stockInfo.totalQuantity;
        productObj.stockStatus = stockInfo.stockStatus;

        // Tính rating info
        const ratingInfo = await reviewService.getProductRatingInfo(
          product._id
        );
        productObj.rating = ratingInfo.rating;
        productObj.numReviews = ratingInfo.numReviews;
        productObj.averageRating = ratingInfo.rating;
        productObj.reviewCount = ratingInfo.numReviews;

        // Tính inventorySummary cho mỗi variant để có priceRange
        if (productObj.variants && productObj.variants.length > 0) {
          productObj.variants = await Promise.all(
            productObj.variants.map(async (variant) => {
              const inventorySummary =
                await variantService.calculateInventorySummary(variant);
              return {
                ...variant,
                inventorySummary,
              };
            })
          );
        }

        return transformProductForPublicList(productObj);
      })
    );

    return {
      success: true,
      products: productsWithStockAndRating,
    };
  },

  /**
   * [PUBLIC] Lấy sản phẩm bán chạy (dựa trên tổng số lượng đã bán từ đơn hàng)
   * @param {Number} limit Số lượng sản phẩm trả về
   */
  getBestSellers: async (limit = 20) => {
    try {
      const inventoryService = require("@services/inventory.service");
      const reviewService = require("@services/review.service");
      const variantService = require("@services/variant.service");

      // 1. Tính tổng số lượng biến thể đã bán từ các đơn hàng đã giao thành công
      const variantSales = await Order.aggregate([
        {
          $match: {
            status: "delivered",
          },
        },
        { $unwind: "$orderItems" },
        {
          $group: {
            _id: "$orderItems.variant",
            totalSold: { $sum: "$orderItems.quantity" },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: Number(limit) * 2 },
      ]);

      if (variantSales.length === 0) {
        return await productService.getNewArrivals(limit);
      }

      // 2. Lấy thông tin product từ variant
      const variantIds = variantSales
        .filter((item) => item._id !== null && item._id !== undefined)
        .map((item) => item._id);

      const variants = await Variant.find({
        _id: { $in: variantIds },
        isActive: true,
        deletedAt: null,
      }).select("product");

      const variantSalesMap = {};
      variantSales.forEach((item) => {
        if (item._id) {
          variantSalesMap[item._id.toString()] = item.totalSold;
        }
      });

      const productSalesMap = {};
      variants.forEach((variant) => {
        if (variant.product) {
          const productId = variant.product.toString();
          const variantId = variant._id.toString();
          const soldCount = variantSalesMap[variantId] || 0;

          if (!productSalesMap[productId]) {
            productSalesMap[productId] = 0;
          }
          productSalesMap[productId] += soldCount;
        }
      });

      const productSales = Object.entries(productSalesMap).map(
        ([productId, totalSold]) => ({
          _id: productId,
          totalSold,
        })
      );

      productSales.sort((a, b) => b.totalSold - a.totalSold);

      const productIds = productSales.map(
        (item) => new mongoose.Types.ObjectId(item._id)
      );

      if (productIds.length === 0) {
        return { success: true, products: [] };
      }

      // 3. Lấy thông tin chi tiết của những sản phẩm bán chạy
      const products = await Product.find({
        _id: { $in: productIds },
        isActive: true,
        deletedAt: null,
      })
        .populate("category", "name")
        .populate("brand", "name logo")
        .populate("tags", "name type description")
        .lean();

      // FIX: Lookup variants từ Variant model thay vì dùng populate
      const activeVariants = await Variant.find({
        product: { $in: productIds },
        isActive: true,
        deletedAt: null,
      })
        .populate("color", "name code type colors")
        .populate("sizes.size", "value type description")
        .lean();

      // Gom variants theo productId
      const variantsByProduct = {};
      activeVariants.forEach((variant) => {
        const productId = variant.product.toString();
        if (!variantsByProduct[productId]) {
          variantsByProduct[productId] = [];
        }
        variantsByProduct[productId].push(variant);
      });

      // Gán variants vào products và filter products có variants
      const productsWithVariants = products
        .map((product) => ({
          ...product,
          variants: variantsByProduct[product._id.toString()] || [],
        }))
        .filter((product) => product.variants.length > 0);

      // 4. Sắp xếp lại đúng thứ tự theo số lượng bán
      const sortedProducts = productsWithVariants.sort((a, b) => {
        const aSold = productSalesMap[a._id.toString()] || 0;
        const bSold = productSalesMap[b._id.toString()] || 0;
        return bSold - aSold;
      });

      const limitedProducts = sortedProducts.slice(0, Number(limit));

      // 5. Chuyển đổi và trả về kết quả
      const transformedProducts = await Promise.all(
        limitedProducts.map(async (product) => {
          const productObj = { ...product };

          const stockInfo = await inventoryService.getProductStockInfo(
            product._id
          );
          productObj.totalQuantity = stockInfo.totalQuantity;
          productObj.stockStatus = stockInfo.stockStatus;

          const ratingInfo = await reviewService.getProductRatingInfo(
            product._id
          );
          productObj.rating = ratingInfo.rating;
          productObj.numReviews = ratingInfo.numReviews;
          productObj.averageRating = ratingInfo.rating;
          productObj.reviewCount = ratingInfo.numReviews;

          if (productObj.variants && productObj.variants.length > 0) {
            productObj.variants = await Promise.all(
              productObj.variants.map(async (variant) => {
                const inventorySummary =
                  await variantService.calculateInventorySummary(variant);
                return {
                  ...variant,
                  inventorySummary,
                };
              })
            );
          }

          const transformedProduct = transformProductForPublicList(productObj);
          transformedProduct.totalSold =
            productSalesMap[product._id.toString()] || 0;
          return transformedProduct;
        })
      );

      return {
        success: true,
        products: transformedProducts,
      };
    } catch (error) {
      console.error("Lỗi khi lấy sản phẩm bán chạy:", error);
      return {
        success: false,
        error: error.message,
        products: [],
      };
    }
  },

  /**
   * [PUBLIC] Lấy sản phẩm liên quan (cùng danh mục) chỉ lấy các sản phẩm có biến thể hoạt động
   * @param {String} id ID sản phẩm
   * @param {Number} limit Số lượng sản phẩm trả về
   */
  getRelatedProducts: async (id, limit = 20) => {
    const product = await Product.findById(id);
    if (!product) {
      throw new ApiError(404, `Không tìm thấy sản phẩm`);
    }

    const inventoryService = require("@services/inventory.service");
    const reviewService = require("@services/review.service");
    const variantService = require("@services/variant.service");

    // 1. Lấy các sản phẩm cùng danh mục
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: id },
      isActive: true,
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .limit(Number(limit) * 2)
      .populate("category", "name")
      .populate("brand", "name logo")
      .populate("tags", "name type description")
      .lean();

    // FIX: Lookup variants từ Variant model thay vì dùng populate
    const activeVariants = await Variant.find({
      product: { $in: relatedProducts.map((p) => p._id) },
      isActive: true,
      deletedAt: null,
    })
      .populate("color", "name code type colors")
      .populate("sizes.size", "value type description")
      .lean();

    // Gom variants theo productId
    const variantsByProduct = {};
    activeVariants.forEach((variant) => {
      const productId = variant.product.toString();
      if (!variantsByProduct[productId]) {
        variantsByProduct[productId] = [];
      }
      variantsByProduct[productId].push(variant);
    });

    // 2. Gán variants và chỉ giữ các sản phẩm có ít nhất một biến thể hoạt động
    const productsWithVariants = relatedProducts
      .map((p) => ({
        ...p,
        variants: variantsByProduct[p._id.toString()] || [],
      }))
      .filter((p) => p.variants.length > 0);

    // 3. Giới hạn số lượng sản phẩm trả về
    const limitedProducts = productsWithVariants.slice(0, Number(limit));

    // 4. Chuyển đổi và trả về kết quả
    const transformedProducts = await Promise.all(
      limitedProducts.map(async (product) => {
        const productObj = { ...product };

        const stockInfo = await inventoryService.getProductStockInfo(
          product._id
        );
        productObj.totalQuantity = stockInfo.totalQuantity;
        productObj.stockStatus = stockInfo.stockStatus;

        const ratingInfo = await reviewService.getProductRatingInfo(
          product._id
        );
        productObj.rating = ratingInfo.rating;
        productObj.numReviews = ratingInfo.numReviews;
        productObj.averageRating = ratingInfo.rating;
        productObj.reviewCount = ratingInfo.numReviews;

        if (productObj.variants && productObj.variants.length > 0) {
          productObj.variants = await Promise.all(
            productObj.variants.map(async (variant) => {
              const inventorySummary =
                await variantService.calculateInventorySummary(variant);
              return {
                ...variant,
                inventorySummary,
              };
            })
          );
        }

        return transformProductForPublicList(productObj);
      })
    );

    return {
      success: true,
      products: transformedProducts,
    };
  },
};

module.exports = productService;
