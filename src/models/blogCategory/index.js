const mongoose = require("mongoose");
const BlogCategorySchema = require("./schema");

const BlogCategory = mongoose.model("BlogCategory", BlogCategorySchema);

module.exports = BlogCategory;

