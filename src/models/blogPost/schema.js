const mongoose = require("mongoose");

const BlogPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    slug: {
      type: String,
      unique: true,
      required: true,
    },

    // Content - Markdown string
    content: {
      type: String,
      required: true,
      maxlength: 50000,
    },

    // Ảnh thumbnail (preview trong danh sách)
    thumbnail: {
      url: {
        type: String,
        required: false, // Upload sau khi tạo blog post
      },
      public_id: {
        type: String,
        required: false, // Upload sau khi tạo blog post
      },
    },

    // Ảnh tiêu đề (featured image - hiển thị đầu bài viết)
    featuredImage: {
      url: {
        type: String,
      },
      public_id: {
        type: String,
      },
      caption: {
        type: String,
        maxlength: 200,
      },
      alt: String,
    },

    // Excerpt/mô tả ngắn
    excerpt: {
      type: String,
      maxlength: 500,
      trim: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BlogCategory",
    },

    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      default: "DRAFT",
    },

    publishedAt: {
      type: Date,
    },

    // SEO
    metaTitle: {
      type: String,
      maxlength: 200,
    },

    metaDescription: {
      type: String,
      maxlength: 500,
    },

    metaKeywords: [String],

    // Stats
    viewCount: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index
// Note: slug index is automatically created by unique: true in schema definition
BlogPostSchema.index({ status: 1, publishedAt: -1 });
BlogPostSchema.index({ category: 1, status: 1 });
BlogPostSchema.index({ tags: 1 });
BlogPostSchema.index({ author: 1 });

// Text search
BlogPostSchema.index({ title: "text", excerpt: "text" });

module.exports = BlogPostSchema;
