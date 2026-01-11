const asyncHandler = require("express-async-handler");
const ChatService = require("@services/chat.service");

/**
 * Helper to emit chat events via Socket.IO
 */
const emitChatEvent = (io, eventName, data) => {
  if (io) {
    io.emit(eventName, data);
    console.log(`[ChatController] Emitted ${eventName}`);
  }
};

const chatController = {
  /**
   * @route GET /api/v1/user/chat/conversations
   * @desc Lấy danh sách TẤT CẢ conversations (không filter status)
   */
  getConversations: asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { page = 1, limit = 50 } = req.query;

    const result = await ChatService.getUserConversations(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return res.json({
      success: true,
      data: result,
    });
  }),

  /**
   * @route POST /api/v1/user/chat/conversations
   * @desc Tạo conversation mới hoặc lấy conversation đã tồn tại
   */
  createConversation: asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { targetUserId, orderId, message, initialMessage } = req.body;
    const io = global.io;

    // Service sẽ throw ApiError nếu không tìm thấy user/staff
    const targetUser = await ChatService.getTargetUser(targetUserId);

    const conversation = await ChatService.getOrCreateConversation(
      userId,
      userRole,
      targetUser._id,
      targetUser.role,
      orderId
    );

    // Hỗ trợ cả message và initialMessage
    const messageText = message || initialMessage;
    let sentMessage = null;

    if (messageText && messageText.trim().length > 0) {
      sentMessage = await ChatService.sendMessage({
        conversationId: conversation._id,
        senderId: userId,
        text: messageText,
      });

      // Emit socket events for real-time updates
      if (io) {
        // 1. Emit to conversation room
        io.to(`conversation:${conversation._id}`).emit("chat:newMessage", {
          message: sentMessage,
          conversationId: conversation._id.toString(),
        });

        // 2. Emit to all participants' personal rooms
        conversation.participants.forEach((p) => {
          const participantId = p.userId._id
            ? p.userId._id.toString()
            : p.userId.toString();
          if (participantId !== userId.toString()) {
            io.to(`user:${participantId}`).emit("chat:notification", {
              conversationId: conversation._id.toString(),
              message: messageText,
              sender: sentMessage.senderId,
              fullMessage: sentMessage,
            });
          }
        });

        // 3. Emit to admin:chat room for admin panel real-time updates
        io.to("admin:chat").emit("chat:adminNotification", {
          conversationId: conversation._id.toString(),
          message: messageText,
          sender: sentMessage.senderId,
          fullMessage: sentMessage,
          conversation: {
            _id: conversation._id,
            participants: conversation.participants,
            lastMessage: {
              text: messageText,
              type: "text",
              createdAt: sentMessage.createdAt,
              senderId: userId.toString(),
            },
          },
        });
        console.log(
          "[ChatController] Emitted socket events for new conversation/message"
        );
      }
    }

    return res.status(201).json({
      success: true,
      data: conversation,
    });
  }),

  /**
   * @route GET /api/v1/user/chat/users
   * @desc Lấy danh sách users có thể chat (cho admin/staff)
   */
  getAvailableUsers: asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { role, search, page = 1, limit = 20 } = req.query;

    const result = await ChatService.getAvailableUsers(userId, {
      role,
      search,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return res.json({
      success: true,
      data: result,
    });
  }),

  /**
   * @route GET /api/v1/user/chat/conversations/:conversationId/messages
   * @desc Lấy tin nhắn trong conversation
   */
  getMessages: asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id;

    // Service sẽ throw ApiError nếu không có quyền
    await ChatService.verifyConversationAccess(conversationId, userId);

    const result = await ChatService.getMessages(conversationId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return res.json({
      success: true,
      data: result,
    });
  }),

  /**
   * @route POST /api/v1/user/chat/conversations/:conversationId/messages
   * @desc Gửi tin nhắn (HTTP fallback)
   */
  sendMessage: asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { type, text, images } = req.body;
    const userId = req.user._id;
    const io = global.io;

    // Service sẽ throw ApiError nếu không có quyền
    const conversation = await ChatService.verifyConversationAccess(
      conversationId,
      userId
    );

    const message = await ChatService.sendMessage({
      conversationId,
      senderId: userId,
      type,
      text,
      images,
    });

    // Emit socket events for real-time updates
    if (io && message) {
      // 1. Emit to conversation room
      io.to(`conversation:${conversationId}`).emit("chat:newMessage", {
        message,
        conversationId: conversationId.toString(),
      });

      // 2. Emit to all participants' personal rooms
      conversation.participants.forEach((p) => {
        const participantId = p.userId._id
          ? p.userId._id.toString()
          : p.userId.toString();
        if (participantId !== userId.toString()) {
          io.to(`user:${participantId}`).emit("chat:notification", {
            conversationId: conversationId.toString(),
            message: text,
            sender: message.senderId,
            fullMessage: message,
          });
        }
      });

      // 3. Emit to admin:chat room
      io.to("admin:chat").emit("chat:adminNotification", {
        conversationId: conversationId.toString(),
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
            senderId: userId.toString(),
          },
        },
      });
      console.log(
        "[ChatController] Emitted socket events for HTTP sendMessage"
      );
    }

    return res.status(201).json({
      success: true,
      data: message,
    });
  }),

  /**
   * @route PUT /api/v1/user/chat/conversations/:conversationId/read
   * @desc Đánh dấu đã đọc
   */
  markAsRead: asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user._id;

    await ChatService.markAsRead(conversationId, userId);

    return res.json({
      success: true,
      message: "Đã đánh dấu đã đọc",
    });
  }),

  /**
   * @route PUT /api/v1/user/chat/conversations/:conversationId/close
   * @desc Đóng conversation
   */
  closeConversation: asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Service sẽ throw ApiError nếu không có quyền
    await ChatService.verifyConversationAccess(conversationId, userId);

    const closedConversation = await ChatService.closeConversation(
      conversationId
    );

    return res.json({
      success: true,
      data: closedConversation,
    });
  }),

  /**
   * @route PUT /api/v1/user/chat/conversations/:conversationId/reopen
   * @desc Mở lại conversation đã đóng
   */
  reopenConversation: asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Service sẽ throw ApiError nếu không có quyền
    await ChatService.verifyConversationAccess(conversationId, userId);

    const reopenedConversation = await ChatService.reopenConversation(
      conversationId
    );

    return res.json({
      success: true,
      data: reopenedConversation,
    });
  }),
};

module.exports = chatController;
