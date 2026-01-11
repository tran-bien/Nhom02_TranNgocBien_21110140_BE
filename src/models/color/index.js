const mongoose = require("mongoose");
const ColorSchema = require("./schema");
const { applyMiddlewares } = require("./middlewares");
const softDeletePlugin = require("@plugins/softDelete");

// Áp dụng plugin xóa mềm
ColorSchema.plugin(softDeletePlugin);

// Áp dụng middlewares
applyMiddlewares(ColorSchema);

// Tạo model
const Color = mongoose.model("Color", ColorSchema);

module.exports = Color;
