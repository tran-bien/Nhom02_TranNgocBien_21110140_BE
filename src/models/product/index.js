const mongoose = require("mongoose");
const ProductSchema = require("./schema");
const { applyMiddlewares } = require("./middlewares");
const softDeletePlugin = require("@plugins/softDelete");

// Áp dụng plugin xóa mềm
ProductSchema.plugin(softDeletePlugin);

// Áp dụng các middlewares
applyMiddlewares(ProductSchema);

// Tạo model
const Product = mongoose.model("Product", ProductSchema);

module.exports = Product;
