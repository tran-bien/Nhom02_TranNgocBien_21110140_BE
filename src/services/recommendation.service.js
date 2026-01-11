const { Product, Order, Variant, Cart } = require("@models");
const ViewHistory = require("../models/viewHistory");
const UserBehavior = require("../models/userBehavior");
const RecommendationCache = require("../models/recommendationCache");
const mongoose = require("mongoose");

/**
 * Recommendation Service - Thuật toán gợi ý cá nhân hóa
 * Kết hợp: Sở thích + Sản phẩm đã xem + Sản phẩm đã mua + Giỏ hàng
 */
const recommendationService = {
  /**
   * Lấy gợi ý cá nhân hóa - KẾT HỢP TẤT CẢ YẾU TỐ
   * @param {string} userId - ID của user
   * @param {number} limit - Số lượng sản phẩm gợi ý (mặc định: 12)
   * @returns {Array} Danh sách sản phẩm gợi ý với score
   */
  getPersonalizedRecommendations: async (userId, limit = 12) => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // ============================================
      // 1. THU THẬP DỮ LIỆU TỪ CÁC NGUỒN
      // ============================================

      const [behavior, viewHistory, orders, cart] = await Promise.all([
        // Sở thích người dùng
        UserBehavior.findOne({ user: userId }).lean(),

        // Lịch sử xem sản phẩm (30 ngày)
        ViewHistory.find({
          user: userId,
          createdAt: { $gte: thirtyDaysAgo },
        })
          .sort({ createdAt: -1 })
          .limit(50)
          .populate({
            path: "product",
            select: "category brand tags",
          })
          .lean(),

        // Đơn hàng đã đặt
        Order.find({
          user: userId,
          status: {
            $in: ["delivered", "out_for_delivery", "confirmed", "pending"],
          },
        })
          .populate({
            path: "orderItems.variant",
            select: "product",
            populate: {
              path: "product",
              select: "category brand tags",
            },
          })
          .lean(),

        // Giỏ hàng hiện tại
        Cart.findOne({ user: userId })
          .populate({
            path: "cartItems.variant",
            select: "product",
            populate: {
              path: "product",
              select: "category brand tags",
            },
          })
          .lean(),
      ]);

      // ============================================
      // 2. PHÂN TÍCH VÀ TÍNH ĐIỂM CHO CÁC TIÊU CHÍ
      // ============================================

      const categoryScores = {};
      const brandScores = {};
      const tagScores = {};
      const excludeProductIds = new Set(); // Sản phẩm cần loại trừ

      // --- 2.1 Điểm từ SỞ THÍCH (UserBehavior) - Weight: 30% ---
      if (behavior) {
        // Favorite categories
        if (behavior.favoriteCategories?.length > 0) {
          behavior.favoriteCategories.forEach((fc) => {
            if (fc.category) {
              const catId = fc.category.toString();
              categoryScores[catId] =
                (categoryScores[catId] || 0) + fc.score * 3;
            }
          });
        }

        // Favorite brands
        if (behavior.favoriteBrands?.length > 0) {
          behavior.favoriteBrands.forEach((fb) => {
            if (fb.brand) {
              const brandId = fb.brand.toString();
              brandScores[brandId] = (brandScores[brandId] || 0) + fb.score * 3;
            }
          });
        }
      }

      // --- 2.2 Điểm từ LỊCH SỬ XEM - Weight: 15% ---
      if (viewHistory?.length > 0) {
        viewHistory.forEach((view, index) => {
          if (!view.product) return;

          // Recency bonus: xem gần đây được điểm cao hơn
          const recencyBonus = Math.max(1, 10 - index * 0.2);

          if (view.product.category) {
            const catId = view.product.category.toString();
            categoryScores[catId] =
              (categoryScores[catId] || 0) + 1.5 * recencyBonus;
          }

          if (view.product.brand) {
            const brandId = view.product.brand.toString();
            brandScores[brandId] =
              (brandScores[brandId] || 0) + 1.2 * recencyBonus;
          }

          if (view.product.tags?.length > 0) {
            view.product.tags.forEach((tag) => {
              const tagId =
                typeof tag === "object" ? tag._id?.toString() : tag?.toString();
              if (tagId) {
                tagScores[tagId] = (tagScores[tagId] || 0) + 1 * recencyBonus;
              }
            });
          }
        });
      }

      // --- 2.3 Điểm từ ĐƠN HÀNG ĐÃ MUA - Weight: 30% ---
      if (orders?.length > 0) {
        orders.forEach((order) => {
          order.orderItems?.forEach((item) => {
            const product = item.variant?.product;
            if (!product) return;

            // Thêm vào danh sách loại trừ (đã mua rồi)
            const productId =
              typeof product === "object"
                ? product._id?.toString()
                : product?.toString();
            if (productId) {
              excludeProductIds.add(productId);
            }

            // Tính điểm cho category/brand/tags của sản phẩm đã mua
            if (typeof product === "object") {
              if (product.category) {
                const catId = product.category.toString();
                categoryScores[catId] = (categoryScores[catId] || 0) + 4;
              }

              if (product.brand) {
                const brandId = product.brand.toString();
                brandScores[brandId] = (brandScores[brandId] || 0) + 3;
              }

              if (product.tags?.length > 0) {
                product.tags.forEach((tag) => {
                  const tagId =
                    typeof tag === "object"
                      ? tag._id?.toString()
                      : tag?.toString();
                  if (tagId) {
                    tagScores[tagId] = (tagScores[tagId] || 0) + 1.5;
                  }
                });
              }
            }
          });
        });
      }

      // --- 2.4 Điểm từ GIỎ HÀNG - Weight: 25% (quan tâm hiện tại) ---
      if (cart?.cartItems?.length > 0) {
        cart.cartItems.forEach((item) => {
          const product = item.variant?.product;
          if (!product) return;

          // Loại trừ sản phẩm đã có trong giỏ
          const productId =
            typeof product === "object"
              ? product._id?.toString()
              : product?.toString();
          if (productId) {
            excludeProductIds.add(productId);
          }

          // Điểm cao cho các tiêu chí từ giỏ hàng (đang quan tâm)
          if (typeof product === "object") {
            if (product.category) {
              const catId = product.category.toString();
              categoryScores[catId] = (categoryScores[catId] || 0) + 7;
            }

            if (product.brand) {
              const brandId = product.brand.toString();
              brandScores[brandId] = (brandScores[brandId] || 0) + 6;
            }

            if (product.tags?.length > 0) {
              product.tags.forEach((tag) => {
                const tagId =
                  typeof tag === "object"
                    ? tag._id?.toString()
                    : tag?.toString();
                if (tagId) {
                  tagScores[tagId] = (tagScores[tagId] || 0) + 3;
                }
              });
            }
          }
        });
      }

      // ============================================
      // 3. TÌM SẢN PHẨM PHÙ HỢP
      // ============================================

      // Lấy top categories và brands
      const topCategories = Object.entries(categoryScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => new mongoose.Types.ObjectId(id));

      const topBrands = Object.entries(brandScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => new mongoose.Types.ObjectId(id));

      const topTags = Object.entries(tagScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => new mongoose.Types.ObjectId(id));

      // Build query để tìm sản phẩm
      const excludeIds = Array.from(excludeProductIds).map(
        (id) => new mongoose.Types.ObjectId(id)
      );

      const query = {
        _id: { $nin: excludeIds },
        isActive: true,
        deletedAt: null,
      };

      // Thêm điều kiện $or nếu có dữ liệu
      const orConditions = [];
      if (topCategories.length > 0) {
        orConditions.push({ category: { $in: topCategories } });
      }
      if (topBrands.length > 0) {
        orConditions.push({ brand: { $in: topBrands } });
      }
      if (topTags.length > 0) {
        orConditions.push({ tags: { $in: topTags } });
      }

      if (orConditions.length > 0) {
        query.$or = orConditions;
      }

      // Lấy danh sách sản phẩm tiềm năng
      const candidateProducts = await Product.find(query)
        .select("_id category brand tags")
        .limit(100)
        .lean();

      // ============================================
      // 4. TÍNH ĐIỂM CHO TỪNG SẢN PHẨM
      // ============================================

      const productScores = candidateProducts.map((product) => {
        let score = 0;

        // Điểm từ category match
        if (product.category) {
          const catId = product.category.toString();
          score += categoryScores[catId] || 0;
        }

        // Điểm từ brand match
        if (product.brand) {
          const brandId = product.brand.toString();
          score += brandScores[brandId] || 0;
        }

        // Điểm từ tags match
        if (product.tags?.length > 0) {
          product.tags.forEach((tag) => {
            const tagId = tag.toString();
            score += tagScores[tagId] || 0;
          });
        }

        return {
          product: product._id,
          score,
        };
      });

      // Sắp xếp và lấy top N (theo limit)
      const recommendations = productScores
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // ============================================
      // 5. FALLBACK - Nếu không có đủ gợi ý
      // ============================================

      if (recommendations.length < 8) {
        // Bổ sung sản phẩm mới nhất
        const existingIds = new Set([
          ...excludeProductIds,
          ...recommendations.map((r) => r.product.toString()),
        ]);

        const newestProducts = await Product.find({
          _id: {
            $nin: Array.from(existingIds).map(
              (id) => new mongoose.Types.ObjectId(id)
            ),
          },
          isActive: true,
          deletedAt: null,
        })
          .sort({ createdAt: -1 })
          .limit(12 - recommendations.length)
          .select("_id")
          .lean();

        newestProducts.forEach((p, i) => {
          recommendations.push({
            product: p._id,
            score: 5 - i * 0.5, // Điểm thấp hơn sản phẩm match
          });
        });
      }

      return recommendations;
    } catch (error) {
      console.error("Lỗi getPersonalizedRecommendations:", error);
      return [];
    }
  },

  /**
   * Get recommendations với cache
   * @param {string} userId - ID của user
   * @param {number} limit - Số lượng sản phẩm gợi ý (mặc định: 12)
   * @returns {Object} { success, products, fromCache }
   */
  getRecommendations: async (userId, limit = 12) => {
    // Check cache (24h)
    const cached = await RecommendationCache.findOne({
      user: userId,
      algorithm: "PERSONALIZED",
    });

    if (cached && cached.products.length > 0) {
      const products = await recommendationService._enrichProducts(
        cached.products
      );

      // Nếu cache có products nhưng không tìm thấy active products, regenerate
      if (products.length === 0) {
        await RecommendationCache.deleteOne({
          user: userId,
          algorithm: "PERSONALIZED",
        });
      } else {
        return {
          success: true,
          products,
          fromCache: true,
        };
      }
    }

    // Generate new recommendations
    const recommendations =
      await recommendationService.getPersonalizedRecommendations(userId, limit);

    // Fallback cuối cùng: sản phẩm mới nhất
    if (recommendations.length === 0) {
      const newestProducts = await Product.find({
        isActive: true,
        deletedAt: null,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("_id");

      recommendations.push(
        ...newestProducts.map((p, i) => ({
          product: p._id,
          score: 10 - i,
        }))
      );
    }

    // Cache for 24h
    await RecommendationCache.findOneAndUpdate(
      { user: userId, algorithm: "PERSONALIZED" },
      {
        $set: {
          products: recommendations.map((r) =>
            typeof r.product === "string" ? r.product : r.product
          ),
          scores: recommendations.map((r) => r.score || 0),
          generatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    // Enrich products với details
    const productIds = recommendations.map((r) =>
      typeof r.product === "string" ? r.product : r.product
    );

    let products = await recommendationService._enrichProducts(productIds);

    // Fallback nếu enrichProducts trả về rỗng trả về sản phẩm nổi bật
    if (products.length === 0 && productIds.length > 0) {
      const productService = require("@services/product.service");
      const featuredResult = await productService.getFeaturedProducts(limit);
      products = featuredResult.products || [];
    }

    return {
      success: true,
      products,
      fromCache: false,
    };
  },

  /**
   * Xóa cache khi có hành vi mới (gọi khi user xem sản phẩm, thêm giỏ hàng, đặt hàng)
   */
  invalidateCache: async (userId) => {
    try {
      await RecommendationCache.deleteMany({ user: userId });
    } catch (error) {
      console.error("Lỗi invalidateCache:", error);
    }
  },

  /**
   * Helper: Enrich products với variants, inventory, rating info
   */
  _enrichProducts: async (productIds) => {
    const inventoryService = require("@services/inventory.service");
    const reviewService = require("@services/review.service");
    const variantService = require("@services/variant.service");

    // Lấy products cơ bản
    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true,
      deletedAt: null,
    })
      .populate("category", "name")
      .populate("brand", "name logo")
      .populate("tags", "name type description")
      .lean();

    if (products.length === 0) {
      return [];
    }

    // Lookup variants từ Variant model
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

    // Gán variants vào products
    const productsWithVariants = products
      .map((product) => ({
        ...product,
        variants: variantsByProduct[product._id.toString()] || [],
      }))
      .filter((product) => product.variants.length > 0);

    // Batch load rating info
    const productIdStrs = productsWithVariants.map((p) => p._id.toString());
    const ratingInfoMap = await reviewService.getBatchProductRatingInfo(
      productIdStrs
    );

    // Transform và enrich products
    const enrichedProducts = await Promise.all(
      productsWithVariants.map(async (product) => {
        const productObj = { ...product };
        const productIdStr = product._id.toString();

        // Tính stock info
        const stockInfo = await inventoryService.getProductStockInfo(
          product._id
        );
        productObj.totalQuantity = stockInfo.totalQuantity;
        productObj.stockStatus = stockInfo.stockStatus;

        // Rating info
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

        // Transform for public list
        return recommendationService._transformProductForPublicList(productObj);
      })
    );

    return enrichedProducts;
  },

  /**
   * Helper: Transform product for public list
   */
  _transformProductForPublicList: (product) => {
    const productObj = { ...product };

    // Build priceRange from variants
    let minPrice = null;
    let maxPrice = null;

    if (productObj.variants && productObj.variants.length > 0) {
      productObj.variants.forEach((variant) => {
        const pricing = variant.inventorySummary?.pricing || {};
        const vMin = pricing.minPrice || 0;
        const vMax = pricing.maxPrice || vMin;

        if (vMin > 0 && (minPrice === null || vMin < minPrice)) minPrice = vMin;
        if (vMax > 0 && (maxPrice === null || vMax > maxPrice)) maxPrice = vMax;
      });
    }

    // Build variantSummary
    const colorSet = new Set();
    const sizeSet = new Set();
    const colors = [];

    if (productObj.variants && productObj.variants.length > 0) {
      productObj.variants.forEach((variant) => {
        if (variant.color && variant.color._id) {
          const colorId = variant.color._id.toString();
          if (!colorSet.has(colorId)) {
            colorSet.add(colorId);
            colors.push({
              _id: variant.color._id,
              name: variant.color.name,
              code: variant.color.code,
              hexCode: variant.color.code || null,
              type: variant.color.type,
              colors: variant.color.colors || [],
            });
          }
        }

        if (variant.sizes && Array.isArray(variant.sizes)) {
          variant.sizes.forEach((sizeObj) => {
            if (sizeObj.size && sizeObj.size._id) {
              sizeSet.add(sizeObj.size._id.toString());
            }
          });
        }
      });
    }

    // Get main image
    let mainImage = "";
    if (productObj.images && productObj.images.length > 0) {
      const main =
        productObj.images.find((img) => img.isMain) || productObj.images[0];
      mainImage = main?.url || "";
    } else if (productObj.variants && productObj.variants.length > 0) {
      const variantWithImages = productObj.variants.find(
        (v) => v.imagesvariant && v.imagesvariant.length > 0
      );
      if (variantWithImages) {
        const main =
          variantWithImages.imagesvariant.find((img) => img.isMain) ||
          variantWithImages.imagesvariant[0];
        mainImage = main?.url || "";
      }
    }

    return {
      _id: productObj._id,
      name: productObj.name,
      slug: productObj.slug,
      description: productObj.description,
      category: productObj.category
        ? { _id: productObj.category._id, name: productObj.category.name }
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
      images: productObj.images || [],
      rating: productObj.rating || 0,
      numReviews: productObj.numReviews || 0,
      averageRating: productObj.rating || 0,
      reviewCount: productObj.numReviews || 0,
      stockStatus: productObj.stockStatus || "out_of_stock",
      totalQuantity: productObj.totalQuantity || 0,
      isActive: productObj.isActive,
      createdAt: productObj.createdAt,
      isNew: false,
      price: minPrice || 0,
      originalPrice: maxPrice || 0,
      discountPercent: 0,
      hasDiscount: false,
      maxDiscountPercent: 0,
      salePercentage: 0,
      priceRange: {
        min: minPrice || 0,
        max: maxPrice || 0,
        isSinglePrice: minPrice === maxPrice,
      },
      mainImage,
      variantSummary: {
        total: productObj.variants?.length || 0,
        active:
          productObj.variants?.filter((v) => v.isActive !== false).length || 0,
        colors,
        colorCount: colorSet.size,
        sizeCount: sizeSet.size,
        priceRange: {
          min: minPrice || 0,
          max: maxPrice || 0,
          isSinglePrice: minPrice === maxPrice,
        },
        discount: { hasDiscount: false, maxPercent: 0 },
      },
      totalInventory: 0,
    };
  },
};

module.exports = recommendationService;
