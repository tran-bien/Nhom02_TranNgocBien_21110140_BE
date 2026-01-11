const mongoose = require("mongoose");
const BlogPostSchema = require("./schema");
const { createSlug } = require("@utils/slugify");

// Middleware để auto-generate slug
BlogPostSchema.pre("save", function (next) {
  if (this.isModified("title") && !this.slug) {
    this.slug = createSlug(this.title);
  }

  // Auto set publishedAt khi status = PUBLISHED
  if (
    this.isModified("status") &&
    this.status === "PUBLISHED" &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }

  next();
});

const BlogPost = mongoose.model("BlogPost", BlogPostSchema);

module.exports = BlogPost;
