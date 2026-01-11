/**
 * Export các models để sử dụng trong toàn bộ ứng dụng
 * Sử dụng lazy loading để tránh circular dependency
 */
const path = require("path");

// Cache cho các models đã load
const modelCache = {};

// Mapping giữa model name và folder name
const modelFolderMap = {
  InventoryItem: "inventory",
  InventoryTransaction: "inventoryTransaction",
  ReturnRequest: "returnRequest",
  SizeGuide: "sizeGuide",
  LoyaltyTier: "loyaltyTier",
  LoyaltyTransaction: "loyaltyTransaction",
  Notification: "notification",
  BlogPost: "blogPost",
  BlogCategory: "blogCategory",
  ViewHistory: "viewHistory",
  UserBehavior: "userBehavior",
  RecommendationCache: "recommendationCache",
  // Các models khác giữ nguyên (folder name = model name lowercase)
};

// Hàm helper để lazy load các models khi cần
function getModel(modelName) {
  if (!modelCache[modelName]) {
    try {
      // Lấy folder name từ mapping hoặc dùng lowercase của model name
      const folderName = modelFolderMap[modelName] || modelName.toLowerCase();
      modelCache[modelName] = require(path.join(__dirname, folderName));
    } catch (error) {
      console.error(`Error loading model ${modelName}:`, error);
      return null;
    }
  }
  return modelCache[modelName];
}

// Export một proxy thay vì trực tiếp export các models
module.exports = new Proxy(
  {},
  {
    get(target, prop) {
      return getModel(prop);
    },
  }
);
