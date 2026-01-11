const mongoose = require("mongoose");
const BrandSchema = require("./schema");
const { applyMiddlewares } = require("./middlewares");
const softDeletePlugin = require("@plugins/softDelete");

// Áp dụng plugin xóa mềm
BrandSchema.plugin(softDeletePlugin);

// Áp dụng middlewares
applyMiddlewares(BrandSchema);

// Tạo model
const Brand = mongoose.model("Brand", BrandSchema);

module.exports = Brand;
