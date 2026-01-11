const { chatModel, freeModel } = require("@config/gemini");
const { KnowledgeDocument } = require("@models");
const NodeCache = require("node-cache");
const SessionManager = require("@utils/sessionManager");

/**
 * Gemini AI Service với RAG (Retrieval-Augmented Generation)
 *
 * LOGIC HOẠT ĐỘNG:
 *
 * 1. CHƯA TRAIN (KB rỗng):
 *    - AI có thể trả lời BẤT CỨ GÌ (không chặn scope)
 *    - Dùng để demo khả năng AI "lung tung" khi chưa được train
 *
 * 2. ĐÃ TRAIN (có KB):
 *    - AI CHỈ trả lời trong phạm vi dữ liệu được train
 *    - Chặn các câu hỏi nhạy cảm (chính trị, y tế, pháp luật...)
 *    - Nếu câu hỏi không liên quan đến KB → từ chối trả lời
 *
 * 3. SERVICE XÓA DỮ LIỆU:
 *    - clearAllDocuments(): Xóa toàn bộ KB → AI quay lại trạng thái "chưa train"
 *    - clearExcelTraining(): Xóa dữ liệu import từ Excel
 */
class GeminiService {
  constructor() {
    // Cache response với TTL tự động cleanup
    this.responseCache = new NodeCache({
      stdTTL: 3600, // 1 hour
      checkperiod: 600, // Check every 10 mins để cleanup expired
      maxKeys: 1000, // Giới hạn 1000 entries
      useClones: false, // Performance optimization
    });

    // Cache trạng thái KB để tránh query liên tục
    this._kbStatusCache = {
      hasKnowledge: null,
      lastCheck: 0,
      ttl: 60000, // 1 phút
    };
  }

  /**
   * Kiểm tra xem KB có dữ liệu không (có cache)
   * @returns {Promise<boolean>}
   */
  async hasKnowledgeBase() {
    const now = Date.now();

    // Check cache
    if (
      this._kbStatusCache.hasKnowledge !== null &&
      now - this._kbStatusCache.lastCheck < this._kbStatusCache.ttl
    ) {
      return this._kbStatusCache.hasKnowledge;
    }

    // Query DB
    const count = await KnowledgeDocument.countDocuments({ isActive: true });
    this._kbStatusCache.hasKnowledge = count > 0;
    this._kbStatusCache.lastCheck = now;

    return this._kbStatusCache.hasKnowledge;
  }

  /**
   * Build context từ Knowledge Base
   *
   * @param {string} userQuery - Câu hỏi của user
   * @returns {string|null} - Context string hoặc null nếu không tìm thấy KB
   */
  async buildContext(userQuery) {
    // Sanitize user input để tránh NoSQL injection và regex DoS
    const sanitizedQuery = userQuery
      .replace(/[${}]/g, "") // Remove MongoDB operators
      .replace(/[\\^$.*+?()[\]|]/g, " ") // Remove regex special chars
      .slice(0, 500) // Limit length để tránh DoS
      .trim();

    // Search Knowledge Base (MongoDB Text Search)
    // Text index đã được tạo trên: title (weight 10), tags (5), content (1)
    const knowledgeDocs = await KnowledgeDocument.find(
      {
        $text: { $search: sanitizedQuery },
        isActive: true,
      },
      {
        score: { $meta: "textScore" },
      }
    )
      .sort({ score: { $meta: "textScore" }, priority: -1 })
      .limit(5); // Tăng lên 5 để có context phong phú hơn

    if (knowledgeDocs.length === 0) {
      return null;
    }

    // Build context string từ các KB docs tìm được
    const contextParts = [];

    knowledgeDocs.forEach((doc) => {
      contextParts.push(`[${doc.category.toUpperCase()}] ${doc.title}`);
      contextParts.push(doc.content);
      contextParts.push("---");
    });

    return contextParts.join("\n");
  }

  /**
   * Validate câu hỏi có trong phạm vi cho phép không
   * CHỈ CHẠY KHI ĐÃ CÓ KB (đã train)
   */
  isInScope(userQuery) {
    const outOfScopePatterns = [
      /chính trị|tổng thống|bầu cử|đảng|quốc hội/i,
      /thuốc|bệnh|y tế|điều trị|khám bệnh|ung thư|covid/i,
      /luật|pháp luật|kiện|tòa án|hình sự|dân sự/i,
      /tôn giáo|phật giáo|công giáo|hồi giáo|chúa/i,
      /hack|crack|phần mềm lậu|virus|malware/i,
      /cách làm bom|vũ khí|ma túy|cần sa/i,
      /khiêu dâm|sex|18\+|người lớn/i,
    ];

    return !outOfScopePatterns.some((pattern) => pattern.test(userQuery));
  }

  /**
   * Chat with Gemini AI
   *
   * LOGIC:
   * - Chưa train (KB rỗng): AI trả lời tự do, không chặn scope
   * - Đã train (có KB): AI chỉ trả lời trong phạm vi KB, chặn câu hỏi nhạy cảm
   */
  async chat(userMessage, { sessionId, history = [] }) {
    try {
      // 1. Kiểm tra KB có dữ liệu không
      const hasKB = await this.hasKnowledgeBase();

      // 2. NẾU ĐÃ CÓ KB → Chặn câu hỏi nhạy cảm
      if (hasKB && !this.isInScope(userMessage)) {
        return {
          response:
            "Xin lỗi, tôi chỉ có thể hỗ trợ về sản phẩm giày và dịch vụ của shop. Bạn có câu hỏi nào khác không? 😊",
          outOfScope: true,
          trained: true,
        };
      }

      // 3. Build context từ Knowledge Base
      const context = await this.buildContext(userMessage);

      // 4. Check cache
      const contextHash = context ? "trained" : "untrained";
      const cacheKey = `${contextHash}_${userMessage
        .toLowerCase()
        .slice(0, 100)}`;
      const cached = this.responseCache.get(cacheKey);
      if (cached) {
        return { response: cached, cached: true, trained: hasKB };
      }

      // 5. Prepare chat history
      const chatHistory = history.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      }));

      // 6. Chọn model dựa trên trạng thái KB
      // - hasKB = true: Dùng chatModel (có system instruction, giới hạn scope)
      // - hasKB = false: Dùng freeModel (không system instruction, trả lời tự do)
      const model = hasKB ? chatModel : freeModel;
      const chat = model.startChat({
        history: chatHistory,
      });

      // 7. Build prompt dựa trên trạng thái KB
      let fullPrompt;

      if (hasKB && context) {
        // ĐÃ TRAIN + TÌM THẤY CONTEXT → Trả lời dựa trên KB
        fullPrompt = `Bạn là trợ lý AI của shop giày. Hãy trả lời câu hỏi của khách hàng DỰA TRÊN THÔNG TIN SAU:

📚 KIẾN THỨC CỦA SHOP:
${context}

⚠️ QUY TẮC:
- CHỈ trả lời dựa trên thông tin được cung cấp ở trên
- Nếu thông tin không có trong kiến thức, hãy nói "Tôi không có thông tin về vấn đề này. Vui lòng liên hệ hotline 1900 xxxx để được tư vấn."
- Trả lời ngắn gọn, thân thiện, bằng tiếng Việt
- Không bịa thông tin

❓ CÂU HỎI KHÁCH HÀNG: ${userMessage}`;
      } else if (hasKB && !context) {
        // ĐÃ TRAIN + KHÔNG TÌM THẤY CONTEXT → Từ chối lịch sự
        return {
          response:
            "Xin lỗi, tôi không tìm thấy thông tin liên quan đến câu hỏi của bạn trong hệ thống. Vui lòng liên hệ hotline 1900 xxxx hoặc chat với nhân viên hỗ trợ để được tư vấn chi tiết hơn nhé! 🙏",
          noContext: true,
          trained: true,
        };
      } else {
        // CHƯA TRAIN → AI trả lời tự do (demo mode)
        fullPrompt = `Bạn là một AI assistant thông minh. Hãy trả lời câu hỏi sau một cách hữu ích và chính xác bằng tiếng Việt:

${userMessage}

Lưu ý: Trả lời ngắn gọn, dễ hiểu.`;
      }

      // 8. Gửi tới Gemini với timeout
      const GEMINI_TIMEOUT = 30000;
      const result = await Promise.race([
        chat.sendMessage(fullPrompt),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Gemini API timeout sau 30 giây")),
            GEMINI_TIMEOUT
          )
        ),
      ]);
      const response = result.response.text();

      // 9. Cache response
      this.responseCache.set(cacheKey, response);

      return {
        response,
        trained: hasKB,
        hasContext: !!context,
      };
    } catch (error) {
      console.error("[GEMINI] Chat error:", error);
      return this._handleError(error);
    }
  }

  /**
   * Xử lý lỗi từ Gemini API
   * @private
   */
  _handleError(error) {
    const errorStatus = error.status || error.statusCode;

    if (errorStatus === 429) {
      const quotaExhausted = error.message?.includes("limit: 0");
      const retryMatch = error.message?.match(/retry in (\d+)/i);
      const retrySeconds = retryMatch ? retryMatch[1] : "vài";

      if (quotaExhausted) {
        return {
          response:
            "Hệ thống AI đã hết lượt sử dụng hôm nay. Vui lòng chat với nhân viên hỗ trợ hoặc gọi hotline 1900 xxxx để được tư vấn nhé!",
          error: true,
          rateLimited: true,
          quotaExhausted: true,
        };
      }

      return {
        response: `AI đang bận, vui lòng thử lại sau ${retrySeconds} giây hoặc chat với nhân viên hỗ trợ nhé!`,
        error: true,
        rateLimited: true,
      };
    }

    if (errorStatus === 404) {
      return {
        response:
          "🔧 Hệ thống AI đang bảo trì. Vui lòng chat với nhân viên hỗ trợ hoặc gọi hotline 1900 xxxx.",
        error: true,
      };
    }

    return {
      response:
        "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng chat với nhân viên hỗ trợ hoặc gọi hotline 1900 xxxx. 🙏",
      error: true,
      errorDetails: error.message,
    };
  }

  /**
   * Lấy trạng thái training của AI
   */
  async getTrainingStatus() {
    const hasKB = await this.hasKnowledgeBase();
    const totalDocs = await KnowledgeDocument.countDocuments({
      isActive: true,
    });

    return {
      trained: hasKB,
      totalDocuments: totalDocs,
      description: hasKB
        ? `AI đã được train với ${totalDocs} documents. Chỉ trả lời trong phạm vi dữ liệu.`
        : "AI CHƯA được train. Có thể trả lời bất cứ gì (demo mode).",
    };
  }

  /**
   * Clear cache (khi update/delete knowledge base)
   */
  clearCache() {
    this.responseCache.flushAll();
    // Reset KB status cache để force recheck
    this._kbStatusCache.hasKnowledge = null;
    this._kbStatusCache.lastCheck = 0;

    return {
      message: "Cache cleared successfully",
      stats: this.responseCache.getStats(),
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.responseCache.getStats();
  }

  /**
   * Validate và generate session ID
   * @private
   */
  _validateAndGenerateSessionId(clientSessionId, clientIp) {
    let sessionId = clientSessionId;

    if (sessionId) {
      if (!SessionManager.validateSessionId(sessionId)) {
        sessionId = SessionManager.generateSessionId(clientIp);
      } else if (SessionManager.isExpired(sessionId, 24 * 60 * 60 * 1000)) {
        sessionId = SessionManager.generateSessionId(clientIp);
      }
    } else {
      sessionId = SessionManager.generateSessionId(clientIp);
    }

    return sessionId;
  }

  /**
   * Chat with validation (wrapper for controller)
   */
  async chatWithValidation(
    message,
    { clientSessionId, clientIp, history = [] }
  ) {
    const sessionId = this._validateAndGenerateSessionId(
      clientSessionId,
      clientIp
    );

    const result = await this.chat(message, {
      sessionId,
      history,
    });

    return {
      ...result,
      sessionId,
    };
  }
}

module.exports = new GeminiService();
