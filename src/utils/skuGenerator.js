/**
 * SKU Generator Utility
 *
 * Tạo SKU (Stock Keeping Unit) cho quản lý kho
 * Format: {PRODUCT_CODE}-{COLOR_CODE}-{GENDER}-{SIZE}-{RANDOM}
 * Example: NKE-BLK-M-40-A1B2
 */

/**
 * Chuẩn hóa string thành code
 * @param {String} str - String cần chuẩn hóa
 * @param {Number} length - Độ dài code
 * @returns {String} - Code đã chuẩn hóa
 */
// Remove Vietnamese diacritics and map to ASCII equivalents
const removeVietnameseDiacritics = (str) => {
  if (!str) return "";

  const map = {
    // Upper
    À: "A",
    Á: "A",
    Â: "A",
    Ã: "A",
    Ä: "A",
    Ă: "A",
    Ắ: "A",
    Ằ: "A",
    Ẳ: "A",
    Ẵ: "A",
    Ặ: "A",
    Đ: "D",
    È: "E",
    É: "E",
    Ê: "E",
    Ë: "E",
    Ì: "I",
    Í: "I",
    Î: "I",
    Ï: "I",
    Ò: "O",
    Ó: "O",
    Ô: "O",
    Õ: "O",
    Ö: "O",
    Ơ: "O",
    Ù: "U",
    Ú: "U",
    Û: "U",
    Ü: "U",
    Ư: "U",
    Ý: "Y",
    // Lower
    à: "a",
    á: "a",
    â: "a",
    ã: "a",
    ä: "a",
    ă: "a",
    ắ: "a",
    ằ: "a",
    ẳ: "a",
    ẵ: "a",
    ặ: "a",
    đ: "d",
    è: "e",
    é: "e",
    ê: "e",
    ë: "e",
    ì: "i",
    í: "i",
    î: "i",
    ï: "i",
    ò: "o",
    ó: "o",
    ô: "o",
    õ: "o",
    ö: "o",
    ơ: "o",
    ù: "u",
    ú: "u",
    û: "u",
    ü: "u",
    ư: "u",
    ý: "y",
    ỳ: "y",
    ỵ: "y",
    ỷ: "y",
    ỹ: "y",
  };

  // First decompose unicode to separate base characters and combining marks,
  // then map precomposed Vietnamese letters and remove remaining marks.
  const decomposed = str.normalize("NFD");
  const mapped = decomposed
    .split("")
    .map((ch) => map[ch] || ch)
    .join("")
    .replace(/[\u0300-\u036f]/g, "");

  return mapped;
};

const normalizeToCode = (str, length = 3) => {
  if (!str) return "XXX".substring(0, length);

  const cleaned = removeVietnameseDiacritics(str)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  if (cleaned.length >= length) return cleaned.substring(0, length);
  return cleaned.padEnd(length, "X");
};

/**
 * Lấy gender code
 * @param {String} gender - male, female, unisex
 * @returns {String} - M, F, hoặc U
 */
const getGenderCode = (gender) => {
  const genderMap = {
    male: "M",
    female: "F",
    unisex: "U",
  };
  return genderMap[gender?.toLowerCase()] || "U";
};

/**
 * Generate random string
 * @param {Number} length - Độ dài
 * @returns {String} - Random string
 */
const generateRandomCode = (length = 4) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate SKU cho variant size
 * @param {Object} params - Tham số
 * @param {String} params.productName - Tên sản phẩm
 * @param {String} params.colorName - Tên màu sắc
 * @param {String} params.gender - Giới tính (male/female/unisex)
 * @param {String} params.sizeValue - Giá trị size (38, 39, 40, M, L, XL...)
 * @param {String} params.productId - ID sản phẩm (optional, để tạo unique)
 * @returns {String} - SKU duy nhất
 *
 * @example
 * generateSKU({
 *   productName: "Nike Air Max",
 *   colorName: "Black",
 *   gender: "male",
 *   sizeValue: "40"
 * })
 * // Returns: "NIK-BLA-M-40-A1B2"
 */
const generateSKU = ({
  productName,
  colorName,
  gender,
  sizeValue,
  productId,
}) => {
  // Product code - 3 ký tự đầu của tên sản phẩm
  const productCode = normalizeToCode(productName, 3);

  // Color code - 3 ký tự đầu của màu
  const colorCode = normalizeToCode(colorName, 3);

  // Gender code - 1 ký tự
  const genderCode = getGenderCode(gender);

  // Size value - chuẩn hóa
  const sizeCode = normalizeToCode(sizeValue.toString(), 3);

  // Random code để đảm bảo unique - 4 ký tự
  const randomCode = generateRandomCode(4);

  // Kết hợp thành SKU
  const sku = `${productCode}-${colorCode}-${genderCode}-${sizeCode}-${randomCode}`;

  return sku;
};

/**
 * Validate SKU format
 * @param {String} sku - SKU cần validate
 * @returns {Boolean} - true nếu hợp lệ
 */
const isValidSKU = (sku) => {
  if (!sku || typeof sku !== "string") return false;

  // Format: XXX-XXX-X-XXX-XXXX
  const skuPattern =
    /^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z]-[A-Z0-9]{1,3}-[A-Z0-9]{4}$/;
  return skuPattern.test(sku);
};

/**
 * Parse SKU thành components
 * @param {String} sku - SKU cần parse
 * @returns {Object} - Components của SKU
 */
const parseSKU = (sku) => {
  if (!isValidSKU(sku)) {
    return null;
  }

  const parts = sku.split("-");
  return {
    productCode: parts[0],
    colorCode: parts[1],
    genderCode: parts[2],
    sizeCode: parts[3],
    randomCode: parts[4],
  };
};

module.exports = {
  generateSKU,
  isValidSKU,
  parseSKU,
  normalizeToCode,
  getGenderCode,
  generateRandomCode,
};
