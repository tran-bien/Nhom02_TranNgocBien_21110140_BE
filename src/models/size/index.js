const mongoose = require("mongoose");
const SizeSchema = require("./schema");
const { applyMiddlewares } = require("./middlewares");
const softDeletePlugin = require("@plugins/softDelete");

// Áp dụng plugin xóa mềm
SizeSchema.plugin(softDeletePlugin);

// Áp dụng middlewares
applyMiddlewares(SizeSchema);

// Tạo model
const Size = mongoose.model("Size", SizeSchema);

module.exports = Size;
