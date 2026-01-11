const UserBehavior = require("../models/userBehavior");
const RecommendationCache = require("../models/recommendationCache");
const { Order, Product } = require("@models");

const userBehaviorService = {
  /**
   * Update behavior từ order delivered
   */
  updateFromOrder: async (userId, order) => {
    try {
      let behavior = await UserBehavior.findOne({ user: userId });

      if (!behavior) {
        behavior = new UserBehavior({ user: userId });
      }

      // Populate order items to get product info
      const populatedOrder = await Order.findById(order._id).populate({
        path: "orderItems.variant",
        populate: { path: "product", populate: ["category", "brand"] },
      });

      if (!populatedOrder) {
        console.warn(`[UserBehavior] Order ${order._id} not found`);
        return;
      }

      // Update favorite categories and brands
      const categoryScores = {};
      const brandScores = {};

      populatedOrder.orderItems.forEach((item) => {
        const product = item.variant?.product;
        if (!product) return;

        // Update category scores
        if (product.category) {
          const catId = product.category._id.toString();
          categoryScores[catId] = (categoryScores[catId] || 0) + item.quantity;
        }

        // Update brand scores
        if (product.brand) {
          const brandId = product.brand._id.toString();
          brandScores[brandId] = (brandScores[brandId] || 0) + item.quantity;
        }
      });

      // Merge with existing
      Object.entries(categoryScores).forEach(([catId, score]) => {
        const existing = behavior.favoriteCategories.find(
          (c) => c.category.toString() === catId
        );
        if (existing) {
          existing.score += score;
        } else {
          behavior.favoriteCategories.push({ category: catId, score });
        }
      });

      Object.entries(brandScores).forEach(([brandId, score]) => {
        const existing = behavior.favoriteBrands.find(
          (b) => b.brand.toString() === brandId
        );
        if (existing) {
          existing.score += score;
        } else {
          behavior.favoriteBrands.push({ brand: brandId, score });
        }
      });

      // Sort by score and keep top 10
      behavior.favoriteCategories.sort((a, b) => b.score - a.score);
      behavior.favoriteCategories = behavior.favoriteCategories.slice(0, 10);

      behavior.favoriteBrands.sort((a, b) => b.score - a.score);
      behavior.favoriteBrands = behavior.favoriteBrands.slice(0, 10);

      // Update purchase stats
      behavior.purchaseFrequency += 1;

      // Update avg order value
      const totalOrders = behavior.purchaseFrequency;
      const newAvg =
        (behavior.avgOrderValue * (totalOrders - 1) +
          order.totalAfterDiscountAndShipping) /
        totalOrders;
      behavior.avgOrderValue = Math.round(newAvg);

      // Update price range
      const orderTotal = order.totalAfterDiscountAndShipping;
      if (
        orderTotal < behavior.avgPriceRange.min ||
        behavior.avgPriceRange.min === 0
      ) {
        behavior.avgPriceRange.min = orderTotal;
      }
      if (orderTotal > behavior.avgPriceRange.max) {
        behavior.avgPriceRange.max = orderTotal;
      }

      behavior.lastUpdated = new Date();
      await behavior.save();

      // FIX: Invalidate recommendation cache để regenerate với data mới
      try {
        await RecommendationCache.deleteMany({ user: userId });
      } catch (cacheError) {
        console.warn(
          "[UserBehavior] Failed to invalidate cache:",
          cacheError.message
        );
      }

      return behavior;
    } catch (error) {
      // FIX Issue #19: Thêm error tracking thay vì chỉ log silent
      console.error("[UserBehavior] Error updating from order:", error.message);
      console.error(
        "[UserBehavior] Stack:",
        error.stack?.split("\n").slice(0, 3).join("\n")
      );
      // TODO: Add error tracking service (Sentry, etc.) khi có
      // errorTracker.capture(error, { userId, orderId: order._id });
      // Don't throw, just log - để không ảnh hưởng main flow
    }
  },

  /**
   * Update từ view history
   */
  updateFromView: async (userId, productId) => {
    try {
      let behavior = await UserBehavior.findOne({ user: userId });

      if (!behavior) {
        behavior = new UserBehavior({ user: userId });
      }

      // Add to viewed products
      const existing = behavior.viewedProducts.find(
        (v) => v.product.toString() === productId.toString()
      );

      if (existing) {
        existing.viewCount += 1;
        existing.lastViewed = new Date();
      } else {
        behavior.viewedProducts.push({
          product: productId,
          viewCount: 1,
          lastViewed: new Date(),
        });
      }

      // Keep only top 50 viewed products
      if (behavior.viewedProducts.length > 50) {
        behavior.viewedProducts.sort((a, b) => b.viewCount - a.viewCount);
        behavior.viewedProducts = behavior.viewedProducts.slice(0, 50);
      }

      // FIX: Cập nhật favoriteCategories và favoriteBrands từ view
      // để Content-based recommendation hoạt động
      const product = await Product.findById(productId)
        .populate("category", "_id")
        .populate("brand", "_id")
        .select("category brand");

      if (product) {
        // Update category score (+1 per view)
        if (product.category) {
          const catId = product.category._id.toString();
          const existingCat = behavior.favoriteCategories.find(
            (c) => c.category.toString() === catId
          );
          if (existingCat) {
            existingCat.score += 1;
          } else {
            behavior.favoriteCategories.push({ category: catId, score: 1 });
          }
        }

        // Update brand score (+1 per view)
        if (product.brand) {
          const brandId = product.brand._id.toString();
          const existingBrand = behavior.favoriteBrands.find(
            (b) => b.brand.toString() === brandId
          );
          if (existingBrand) {
            existingBrand.score += 1;
          } else {
            behavior.favoriteBrands.push({ brand: brandId, score: 1 });
          }
        }

        // Sort and keep top 10
        behavior.favoriteCategories.sort((a, b) => b.score - a.score);
        behavior.favoriteCategories = behavior.favoriteCategories.slice(0, 10);

        behavior.favoriteBrands.sort((a, b) => b.score - a.score);
        behavior.favoriteBrands = behavior.favoriteBrands.slice(0, 10);
      }

      behavior.lastUpdated = new Date();
      await behavior.save();

      // FIX: Invalidate recommendation cache để regenerate với data mới
      try {
        await RecommendationCache.deleteMany({ user: userId });
      } catch (cacheError) {
        console.warn(
          "[UserBehavior] Failed to invalidate cache:",
          cacheError.message
        );
      }

      return behavior;
    } catch (error) {
      // FIX Issue #19: Thêm error tracking thay vì chỉ log silent
      console.error("[UserBehavior] Error updating from view:", error.message);
      console.error(
        "[UserBehavior] Stack:",
        error.stack?.split("\n").slice(0, 3).join("\n")
      );
      // Don't throw, just log - để không ảnh hưởng main flow
    }
  },
};

module.exports = userBehaviorService;
