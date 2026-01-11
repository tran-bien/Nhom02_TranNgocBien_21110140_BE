const mongoose = require("mongoose");

/**
 * Chat Message - Text only version
 * Simplified: Only text messages, no images
 */
const ChatMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatConversation",
      required: true,
      index: true,
    },

    // Người gửi
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Loại tin nhắn - chỉ còn text
    type: {
      type: String,
      enum: ["text"],
      required: true,
      default: "text",
    },

    // Nội dung tin nhắn
    text: {
      type: String,
      required: true,
      maxLength: 2000,
      trim: true,
    },

    // Đã đọc chưa
    readBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// INDEXES
ChatMessageSchema.index({ conversationId: 1, createdAt: -1 });
ChatMessageSchema.index({ senderId: 1 });

module.exports = mongoose.model("ChatMessage", ChatMessageSchema);
