const mongoose = require("mongoose");
const TagSchema = require("./schema");
const { applyMiddlewares } = require("./middlewares");
const softDeletePlugin = require("@plugins/softDelete");

// Áp dụng plugin xóa mềm
TagSchema.plugin(softDeletePlugin);

// Áp dụng middlewares
applyMiddlewares(TagSchema);

// Tạo model
const Tag = mongoose.model("Tag", TagSchema);

module.exports = Tag;
