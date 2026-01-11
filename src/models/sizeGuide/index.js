const mongoose = require("mongoose");
const SizeGuideSchema = require("./schema");
const softDeletePlugin = require("@plugins/softDelete");

// Áp dụng plugin xóa mềm
SizeGuideSchema.plugin(softDeletePlugin);
const SizeGuide = mongoose.model("SizeGuide", SizeGuideSchema);

module.exports = SizeGuide;
