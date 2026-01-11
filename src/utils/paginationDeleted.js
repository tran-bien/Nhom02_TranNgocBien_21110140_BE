/**
 * Hàm phân trang cho dữ liệu đã xóa mềm
 * @param {Object} model - Mongoose model cần truy vấn
 * @param {Object} query - Đối tượng lọc dữ liệu
 * @param {Object} options - Các tùy chọn phân trang: page, limit, sort, select, populate, collation
 * @returns {Promise<Object>} - Kết quả phân trang chứa tổng số bản ghi, số trang, trang hiện tại và dữ liệu đã xóa mềm
 */
const paginateDeleted = async (model, query, options = {}) => {
  // Trang hiện tại (mặc định là 1 nếu không cung cấp)
  const page = parseInt(options.page, 1) || 1;
  // Số bản ghi mỗi trang (mặc định là 15 nếu không cung cấp)
  const limit = parseInt(options.limit, 15) || 15;

  // Xử lý select để chỉ lấy các trường cần thiết
  const selectOption = options.select || "";

  // Xử lý populate nếu có
  const populateOption = options.populate || null;

  // Xử lý sắp xếp, mặc định sắp xếp theo deletedAt giảm dần
  const sortOption = options.sort || { deletedAt: -1 };

  // Tạo options cho findDeleted method từ plugin
  const queryOptions = {
    sort: sortOption,
    page: page,
    limit: limit,
  };

  // Sử dụng phương thức findDeleted từ plugin - đã có sẵn logic phân trang bên trong
  let queryBuilder = model.findDeleted(query, queryOptions);

  // Thêm select nếu có
  if (selectOption) {
    queryBuilder = queryBuilder.select(selectOption);
  }

  // Thêm populate nếu có
  if (populateOption) {
    if (Array.isArray(populateOption)) {
      populateOption.forEach((item) => {
        queryBuilder = queryBuilder.populate(item);
      });
    } else {
      queryBuilder = queryBuilder.populate(populateOption);
    }
  }

  // Thêm collation nếu có (hỗ trợ sắp xếp tiếng Việt)
  if (options.collation) {
    queryBuilder = queryBuilder.collation(options.collation);
  }

  // Thực hiện các truy vấn đồng thời để tối ưu hiệu suất
  const [totalItems, data] = await Promise.all([
    model.countDeleted(query),
    queryBuilder,
  ]);

  // Tính tổng số trang
  const totalPages = Math.ceil(totalItems / limit);

  // Trả về đối tượng kết quả với cấu trúc giống paginate thông thường
  return {
    success: true,
    total: totalItems,
    count: data.length,
    totalPages,
    currentPage: page,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    data,
  };
};

module.exports = paginateDeleted;
