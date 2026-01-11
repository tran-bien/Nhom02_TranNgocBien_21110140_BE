const mongoose = require("mongoose");
const CategorySchema = require("./schema");
const { applyMiddlewares } = require("./middlewares");
const softDeletePlugin = require("@plugins/softDelete");

// Áp dụng plugin xóa mềm
CategorySchema.plugin(softDeletePlugin);

// Áp dụng middlewares
applyMiddlewares(CategorySchema);

// Tạo model
const Category = mongoose.model("Category", CategorySchema);

module.exports = Category;
