const ChatService = require("@services/chat.service");

/**
 * Socket.IO Chat Handler
 * SIMPLIFIED - Không có status open/close
 */
module.exports = (io, socket) => {
  const userId = socket.userId;
  const userRole = socket.userRole;

  console.log(`[CHAT] User connected: ${userId} (${userRole})`);

  // Join user's personal room - để nhận notifications
  socket.join(`user:${userId}`);
  console.log(`[CHAT] User ${userId} joined personal room user:${userId}`);

  // Admin/Staff join special room to receive ALL chat notifications
  if (userRole === "admin" || userRole === "staff") {
    socket.join("admin:chat");
    console.log(`[CHAT] Admin/Staff ${userId} joined admin:chat room`);
  }

  /**
   * Join conversation room
   */
  socket.on("chat:join", async (conversationId, callback) => {
    try {
      console.log(
        `[CHAT] User ${userId} trying to join conversation: ${conversationId}`
      );

      // Verify user is a participant
      const conversation = await ChatService.getConversation(conversationId);
      if (!conversation) {
        console.log(`[CHAT] Conversation not found: ${conversationId}`);
        return callback?.({
          success: false,
          error: "Conversation không tồn tại",
        });
      }

      // Admin/Staff có thể join mọi conversation
      const isParticipant = conversation.participants.some(
        (p) => p.userId._id.toString() === userId.toString()
      );

      if (!isParticipant && userRole !== "admin" && userRole !== "staff") {
        console.log(`[CHAT] User ${userId} is NOT a participant`);
        return callback?.({
          success: false,
          error: "Bạn không có quyền truy cập conversation này",
        });
      }

      // Join the room
      socket.join(`conversation:${conversationId}`);
      console.log(
        `[CHAT] User ${userId} JOINED room conversation:${conversationId}`
      );

      // Mark messages as read
      await ChatService.markAsRead(conversationId, userId);

      // Notify others
      socket.to(`conversation:${conversationId}`).emit("chat:userJoined", {
        userId,
        conversationId,
      });

      callback?.({ success: true });
    } catch (error) {
      console.error("[CHAT] Join error:", error);
      callback?.({ success: false, error: error.message });
    }
  });

  /**
   * Send message - SIMPLIFIED
   */
  socket.on("chat:sendMessage", async (data, callback) => {
    try {
      const { conversationId, text } = data;
      console.log(
        `[CHAT] User ${userId} sending message to conversation: ${conversationId}`
      );

      if (!conversationId) {
        return callback?.({
          success: false,
          error: "conversationId là bắt buộc",
        });
      }

      // Verify user is participant
      const conversation = await ChatService.getConversation(conversationId);
      if (!conversation) {
        return callback?.({
          success: false,
          error: "Conversation không tồn tại",
        });
      }

      // Admin/Staff có thể gửi tin nhắn trong mọi conversation
      const isParticipant = conversation.participants.some(
        (p) => p.userId._id.toString() === userId.toString()
      );

      if (!isParticipant && userRole !== "admin" && userRole !== "staff") {
        return callback?.({
          success: false,
          error: "Bạn không có quyền gửi tin nhắn trong conversation này",
        });
      }

      // Validate text
      if (!text || !text.trim()) {
        return callback?.({
          success: false,
          error: "Tin nhắn không được để trống",
        });
      }

      // Save message to DB
      const message = await ChatService.sendMessage({
        conversationId,
        senderId: userId,
        text,
      });

      console.log(`[CHAT] Message saved: ${message._id}`);

      // 1. Broadcast to conversation room (những người đã join room)
      io.to(`conversation:${conversationId}`).emit("chat:newMessage", {
        message,
        conversationId,
      });
      console.log(`[CHAT] Broadcasted to room conversation:${conversationId}`);

      // 2. ALSO send notification to ALL participants' personal rooms
      // Điều này đảm bảo admin/staff nhận được ngay cả khi chưa join conversation room
      conversation.participants.forEach((p) => {
        const participantId = p.userId._id.toString();
        if (participantId !== userId.toString()) {
          // Gửi đến personal room của participant
          io.to(`user:${participantId}`).emit("chat:notification", {
            conversationId,
            message: text,
            sender: message.senderId,
            fullMessage: message,
          });
          console.log(`[CHAT] Sent notification to user:${participantId}`);
        }
      });

      // 3. Broadcast to admin:chat room so all admin/staff can see new messages
      // This ensures real-time updates on admin chat page
      io.to("admin:chat").emit("chat:adminNotification", {
        conversationId,
        message: text,
        sender: message.senderId,
        fullMessage: message,
        conversation: {
          _id: conversation._id,
          participants: conversation.participants,
          lastMessage: {
            text: text,
            type: "text",
            createdAt: message.createdAt,
            senderId: userId,
          },
        },
      });
      console.log(`[CHAT] Broadcasted to admin:chat room`);

      callback?.({ success: true, message });
    } catch (error) {
      console.error("[CHAT] Send message error:", error);
      callback?.({ success: false, error: error.message });
    }
  });

  /**
   * Typing indicator
   */
  socket.on("chat:typing", (conversationId) => {
    socket.to(`conversation:${conversationId}`).emit("chat:userTyping", {
      userId,
      conversationId,
    });
  });

  /**
   * Stop typing
   */
  socket.on("chat:stopTyping", (conversationId) => {
    socket.to(`conversation:${conversationId}`).emit("chat:userStopTyping", {
      userId,
      conversationId,
    });
  });

  /**
   * Leave conversation
   */
  socket.on("chat:leave", (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
    console.log(
      `[CHAT] User ${userId} left room conversation:${conversationId}`
    );
    socket.to(`conversation:${conversationId}`).emit("chat:userLeft", {
      userId,
      conversationId,
    });
  });

  /**
   * Disconnect
   */
  socket.on("disconnect", () => {
    console.log(`[CHAT] User disconnected: ${userId}`);
  });
};
