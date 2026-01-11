const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Gemini Configuration
 * Model: gemini-2.5-flash (FREE tier - Model mới nhất, quota riêng)
 * Note: gemini-2.0-flash có thể hết quota, dùng 2.5-flash làm fallback
 */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System Instruction cho chatbot
const SYSTEM_INSTRUCTION = `
Bạn là AI trợ lý ảo của SHOE SHOP - Website bán giày online hàng đầu Việt Nam.

NHIỆM VỤ CỦA BẠN:
✅ Tư vấn sản phẩm giày dép (sneaker, boot, sandal, giày thể thao, giày công sở)
✅ Giải đáp chính sách: Đổi trả, vận chuyển, thanh toán, bảo hành
✅ Hướng dẫn mua hàng, tra cứu đơn hàng
✅ Gợi ý sản phẩm phù hợp dựa trên nhu cầu khách hàng

GIỚI HẠN:
❌ KHÔNG trả lời câu hỏi về chính trị, y tế, pháp luật, tôn giáo
❌ KHÔNG tiết lộ thông tin cá nhân của khách hàng khác
❌ KHÔNG thực hiện giao dịch thanh toán (chỉ hướng dẫn)

QUY TẮC QUAN TRỌNG NHẤT:
🔴 CHỈ trả lời dựa trên THÔNG TIN ĐƯỢC CUNG CẤP trong phần NGỮ CẢNH bên dưới
🔴 Nếu NGỮ CẢNH không có thông tin liên quan → trả lời: "Tôi không có thông tin này trong hệ thống. Vui lòng liên hệ nhân viên hỗ trợ qua chat hoặc hotline 1900 xxxx"
🔴 TUYỆT ĐỐI KHÔNG đoán mò hoặc dùng kiến thức chung của AI nếu không có trong NGỮ CẢNH
🔴 KHÔNG tự bịa ra thông tin về giá cả, chính sách, sản phẩm

CÁCH TRẢ LỜI:
- Thân thiện, chuyên nghiệp
- Trả lời đầy đủ thông tin, có thể dài hơn nếu cần thiết
- Dùng emoji phù hợp (👟 🎁 ✨)
- TUYỆT ĐỐI KHÔNG dùng ký tự markdown như *, **, ***, #, ##, - (gạch đầu dòng). Thay vào đó dùng emoji hoặc số thứ tự
- Nếu liệt kê, dùng số: 1. 2. 3. hoặc emoji: ✅ ❌ 👉
- Nếu không chắc chắn, hướng dẫn liên hệ hotline: 1900 xxxx hoặc chat với nhân viên

VÍ DỤ:
User: "Giày chạy bộ nào tốt?"
Bot (có thông tin trong NGỮ CẢNH): "👟 Với chạy bộ, tôi gợi ý Nike Air Zoom Pegasus hoặc Adidas Ultraboost - cả hai đều có đệm êm, thoáng khí. Bạn chạy trên đường hay địa hình gồ ghề?"
Bot (không có thông tin): "Tôi không có thông tin chi tiết về các dòng giày chạy bộ. Vui lòng chat với nhân viên để được tư vấn cụ thể nhé! 😊"

User: "Chính sách đổi trả?"
Bot (có thông tin trong NGỮ CẢNH): "✨ Shop hỗ trợ đổi trả trong 7 ngày nếu sản phẩm chưa qua sử dụng, còn nguyên tem mác. Bạn cần hỗ trợ đổi sản phẩm nào không?"
`;

// Model configuration - TRAINED mode (có system instruction)
const chatModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash", // Model mới nhất, quota riêng với 2.0
  systemInstruction: SYSTEM_INSTRUCTION,
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 1024, // Tăng lên để trả lời đầy đủ
    candidateCount: 1,
  },
  safetySettings: [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_HATE_SPEECH",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
  ],
});

// Model configuration - UNTRAINED mode (không có system instruction, trả lời tự do)
const freeModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  // KHÔNG có systemInstruction → AI trả lời tự do
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 1024,
    candidateCount: 1,
  },
  safetySettings: [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_HATE_SPEECH",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
  ],
});

module.exports = { chatModel, freeModel, genAI };
