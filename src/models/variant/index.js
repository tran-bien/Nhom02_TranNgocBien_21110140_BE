const mongoose = require("mongoose");
const VariantSchema = require("./schema");
const { applyMiddlewares } = require("./middlewares");
const softDeletePlugin = require("@plugins/softDelete");

// Áp dụng plugin xóa mềm
VariantSchema.plugin(softDeletePlugin);

// Áp dụng middlewares
applyMiddlewares(VariantSchema);

const Variant = mongoose.model("Variant", VariantSchema);

module.exports = Variant;
