const mongoose = require("mongoose");

/**
 * Knowledge Base Document
 * Lưu trữ dữ liệu training cho Gemini AI
 */
const KnowledgeDocumentSchema = new mongoose.Schema(
  {
    // Phân loại
    category: {
      type: String,
      enum: [
        "category_info", // Danh mục sản phẩm
        "policy", // Chính sách (đổi trả, vận chuyển, thanh toán)
        "faq", // Câu hỏi thường gặp
        "brand_info", // Thông tin thương hiệu
        "product_info", // Thông tin sản phẩm
        "how_to_size", // Hướng dẫn chọn size
      ],
      required: true,
      index: true,
    },

    // Tiêu đề
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 200,
    },

    // Nội dung chính
    content: {
      type: String,
      required: true,
      maxLength: 5000, // Gemini 2.0 Flash có 1M tokens context window
    },

    // Keywords để search
    tags: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],

    // Độ ưu tiên (càng cao càng được ưu tiên inject vào prompt)
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },

    // Metadata
    metadata: {
      source: {
        type: String,
        enum: ["manual", "excel_import"],
        default: "manual",
      },
      lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    // Trạng thái
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// TEXT INDEX for full-text search
KnowledgeDocumentSchema.index(
  {
    title: "text",
    content: "text",
    tags: "text",
  },
  {
    weights: {
      title: 10,
      tags: 5,
      content: 1,
    },
    name: "knowledge_text_index",
  }
);

// Compound indexes
KnowledgeDocumentSchema.index({ category: 1, priority: -1, isActive: 1 });
KnowledgeDocumentSchema.index({ isActive: 1, priority: -1 });

module.exports = mongoose.model("KnowledgeDocument", KnowledgeDocumentSchema);
