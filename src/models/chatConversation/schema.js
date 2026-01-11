const mongoose = require("mongoose");

/**
 * Chat Conversation - Simple version
 * Support: User/Staff/Admin/Shipper chat 1-1
 */
const ChatConversationSchema = new mongoose.Schema(
  {
    // Người tham gia (chỉ 2 người: 1 user/shipper + 1 staff/admin)
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["user", "staff", "admin", "shipper"],
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Tin nhắn cuối (denormalized để query nhanh)
    lastMessage: {
      text: String,
      sentBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      sentAt: Date,
    },

    // Số tin chưa đọc (theo từng người)
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
      // Format: { "userId1": 3, "userId2": 0 }
    },
  },
  {
    timestamps: true,
  }
);

// INDEXES
ChatConversationSchema.index({ "participants.userId": 1 });
ChatConversationSchema.index({ "lastMessage.sentAt": -1 });
ChatConversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model("ChatConversation", ChatConversationSchema);
