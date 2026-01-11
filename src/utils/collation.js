/**
 * Helper functions cho collation tiếng Việt
 */

/**
 * Trả về collation settings cho tiếng Việt
 * @returns {Object} Collation object cho MongoDB query
 */
const getVietnameseCollation = () => {
  return {
    locale: "vi",
    strength: 1, // Chỉ so sánh ký tự cơ bản (base characters), bỏ qua dấu và hoa/thường
    caseLevel: false,
    numericOrdering: false,
  };
};

/**
 * Trả về collation settings cho tiếng Việt (case sensitive)
 * @returns {Object} Collation object cho MongoDB query với case sensitivity
 */
const getVietnameseCaseSensitiveCollation = () => {
  return {
    locale: "vi",
    strength: 2, // So sánh ký tự cơ bản + dấu, vẫn phân biệt hoa/thường ở mức độ nhất định
    caseLevel: true,
    numericOrdering: false,
  };
};

/**
 * Trả về collation settings cho tiếng Việt (accent sensitive)
 * @returns {Object} Collation object cho MongoDB query với accent sensitivity
 */
const getVietnameseAccentSensitiveCollation = () => {
  return {
    locale: "vi",
    strength: 3, // So sánh đầy đủ bao gồm hoa/thường
    caseLevel: true,
    numericOrdering: false,
  };
};

/**
 * Kiểm tra xem có cần dùng Vietnamese collation không
 * @param {string} sortField - Trường cần sort
 * @returns {boolean} True nếu cần Vietnamese collation
 */
const needsVietnameseCollation = (sortField) => {
  // Các trường thường chứa text tiếng Việt
  const vietnameseTextFields = ["name", "title", "description", "content"];
  return vietnameseTextFields.some((field) => sortField.includes(field));
};

module.exports = {
  getVietnameseCollation,
  getVietnameseCaseSensitiveCollation,
  getVietnameseAccentSensitiveCollation,
  needsVietnameseCollation,
};
