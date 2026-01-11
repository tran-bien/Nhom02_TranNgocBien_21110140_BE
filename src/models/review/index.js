const mongoose = require("mongoose");
const ReviewSchema = require("./schema");
const softDeletePlugin = require("@plugins/softDelete");

// Áp dụng plugin xóa mềm
ReviewSchema.plugin(softDeletePlugin);

// Tạo model
const Review = mongoose.model("Review", ReviewSchema);

module.exports = Review;
