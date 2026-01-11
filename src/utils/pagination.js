/**
 * Hàm phân trang cho Mongoose
 * @param {Object} model - Mongoose model cần truy vấn
 * @param {Object} query - Đối tượng lọc dữ liệu
 * @param {Object} options - Các tùy chọn phân trang: page, limit, sort, select, populate, collation
 * @returns {Promise<Object>} - Kết quả phân trang
 */
const paginate = async (model, query, options = {}) => {
  // FIX Bug #9: Thêm giới hạn tối đa cho pagination để tránh DoS
  const MAX_LIMIT = 100;
  const DEFAULT_LIMIT = 50;

  // Xử lý page - đảm bảo luôn là số nguyên dương
  let page = 1; // Giá trị mặc định
  if (options.page !== undefined) {
    // Chuyển đổi sang số
    const parsedPage = Number(options.page);
    // Kiểm tra có phải là số hợp lệ không
    if (!isNaN(parsedPage) && parsedPage > 0) {
      page = Math.floor(parsedPage); // Đảm bảo là số nguyên
    }
  }

  // Xử lý limit - đảm bảo luôn là số nguyên dương và không vượt quá MAX_LIMIT
  let limit = DEFAULT_LIMIT; // Giá trị mặc định
  if (options.limit !== undefined) {
    // Chuyển đổi sang số
    const parsedLimit = Number(options.limit);
    // Kiểm tra có phải là số hợp lệ không
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      // FIX: Giới hạn limit tối đa
      limit = Math.min(Math.floor(parsedLimit), MAX_LIMIT);
    }
  }

  // Tính toán số bản ghi cần bỏ qua
  const skip = (page - 1) * limit;

  // Xử lý truy vấn cơ bản
  let queryBuilder = model.find(query);

  // Thêm select nếu cần
  if (options.select) {
    queryBuilder = queryBuilder.select(options.select);
  }

  // Thêm populate nếu cần
  if (options.populate) {
    if (Array.isArray(options.populate)) {
      options.populate.forEach((item) => {
        queryBuilder = queryBuilder.populate(item);
      });
    } else {
      queryBuilder = queryBuilder.populate(options.populate);
    }
  }

  // Thêm sắp xếp
  queryBuilder = queryBuilder.sort(options.sort || { createdAt: -1 });

  // Thêm collation nếu có (hỗ trợ sắp xếp tiếng Việt)
  if (options.collation) {
    queryBuilder = queryBuilder.collation(options.collation);
  }

  // Đếm tổng số bản ghi
  const countPromise = model.countDocuments(query);

  // Thêm phân trang
  queryBuilder = queryBuilder.skip(skip).limit(limit);

  // Thực hiện cả hai truy vấn
  const [total, data] = await Promise.all([countPromise, queryBuilder]);

  // Tính tổng số trang
  const totalPages = Math.ceil(total / limit);

  // Trả về kết quả
  return {
    success: true,
    count: data.length,
    total,
    totalPages,
    currentPage: page,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    data,
  };
};

module.exports = paginate;
