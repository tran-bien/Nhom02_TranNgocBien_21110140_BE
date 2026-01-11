const multer = require("multer");
const cloudinary = require("@config/cloudinary");
const ApiError = require("@utils/ApiError");
const { Readable } = require("stream");

// Danh sách các loại file ảnh được phép
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

// Danh sách các loại file Excel được phép
const ALLOWED_EXCEL_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
];

// Kích thước file tối đa (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Kích thước file Excel tối đa (10MB)
const MAX_EXCEL_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Upload file buffer to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {string} folder - Folder path on Cloudinary
 * @param {string} originalname - Original filename
 * @returns {Promise<Object>} - Cloudinary upload result
 */
const uploadToCloudinary = (buffer, folder, originalname) => {
  return new Promise((resolve, reject) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Safely extract filename without extension and sanitize it
    const nameWithoutExt =
      originalname.substring(0, originalname.lastIndexOf(".")) || originalname;
    const filename = nameWithoutExt
      .replace(/\s+/g, "-") // Replace spaces with dashes
      .replace(/[^a-zA-Z0-9-_]/g, "") // Remove special characters except dash and underscore
      .substring(0, 100); // Limit length to prevent issues
    const public_id = filename
      ? `${filename}-${uniqueSuffix}`
      : `upload-${uniqueSuffix}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        public_id: public_id,
        resource_type: "auto",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [{ quality: "auto" }],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    const readableStream = Readable.from(buffer);
    readableStream.pipe(uploadStream);
  });
};

/**
 * Tạo memory storage cho multer
 * @returns {multer.StorageEngine} - Memory storage
 */
const createStorage = () => {
  return multer.memoryStorage();
};

/**
 * Kiểm tra loại file
 * @param {Object} req - Request object
 * @param {Object} file - File object từ multer
 * @param {Function} cb - Callback function
 */
const fileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        "Loại file không được hỗ trợ. Chỉ chấp nhận file JPEG, JPG, PNG, WEBP"
      ),
      false
    );
  }
};

/**
 * Kiểm tra loại file Excel
 * @param {Object} req - Request object
 * @param {Object} file - File object từ multer
 * @param {Function} cb - Callback function
 */
const excelFileFilter = (req, file, cb) => {
  if (ALLOWED_EXCEL_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        "Loại file không được hỗ trợ. Chỉ chấp nhận file Excel (.xlsx, .xls)"
      ),
      false
    );
  }
};

/**
 * Validate field name để tránh DoS attack
 * @param {String} fieldName - Tên field cần validate
 * @returns {Boolean} - True nếu field name hợp lệ
 */
const validateFieldName = (fieldName) => {
  // Kiểm tra field name không được rỗng hoặc chỉ có whitespace
  if (
    !fieldName ||
    typeof fieldName !== "string" ||
    fieldName.trim().length === 0
  ) {
    return false;
  }

  // Kiểm tra độ dài field name (tối đa 50 ký tự)
  if (fieldName.length > 50) {
    return false;
  }

  // Kiểm tra field name chỉ chứa ký tự hợp lệ (a-z, A-Z, 0-9, _, -)
  const validFieldNameRegex = /^[a-zA-Z0-9_-]+$/;
  return validFieldNameRegex.test(fieldName);
};

/**
 * Tạo middleware upload cho nhiều ảnh
 * @param {String} folderPath - Đường dẫn thư mục trên Cloudinary
 * @param {String} fieldName - Tên field trong form-data
 * @param {Number} maxCount - Số lượng file tối đa
 * @returns {Function} - Middleware multer
 */
const createMultiUploadMiddleware = (folderPath, fieldName, maxCount = 10) => {
  // Validate field name trước khi tạo middleware
  if (!validateFieldName(fieldName)) {
    throw new ApiError(400, "Field name không hợp lệ");
  }

  const storage = createStorage();
  const upload = multer({
    storage,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: maxCount,
      fields: 10,
      parts: 20,
      headerPairs: 2000,
    },
    fileFilter,
  }).array(fieldName, maxCount);

  // Return middleware that only handles multer (NOT Cloudinary upload yet)
  // Cloudinary upload will be done in controller after validation
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        return next(err);
      }
      // Store folderPath for later use in controller
      if (req.files) {
        req.uploadFolderPath = folderPath;
      }
      next();
    });
  };
};

/**
 * Tạo middleware upload cho một ảnh
 * @param {String} folderPath - Đường dẫn thư mục trên Cloudinary
 * @param {String} fieldName - Tên field trong form-data
 * @returns {Function} - Middleware multer
 */
const createSingleUploadMiddleware = (folderPath, fieldName) => {
  // Validate field name trước khi tạo middleware
  if (!validateFieldName(fieldName)) {
    throw new ApiError(400, "Field name không hợp lệ");
  }

  const storage = createStorage();
  const upload = multer({
    storage,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1,
      fields: 5,
      parts: 10,
      headerPairs: 2000,
    },
    fileFilter,
  }).single(fieldName);

  // Return middleware that only handles multer (NOT Cloudinary upload yet)
  // Cloudinary upload will be done in controller after validation
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        return next(err);
      }
      // Store folderPath for later use in controller
      if (req.file) {
        req.uploadFolderPath = folderPath;
      }
      next();
    });
  };
};

/**
 * Helper function to upload files to Cloudinary (called from controllers)
 * @param {Object} req - Request object with files
 * @returns {Promise<void>} - Updates req.file or req.files with Cloudinary results
 */
const processCloudinaryUpload = async (req) => {
  if (!req.uploadFolderPath) {
    throw new ApiError(500, "Missing upload folder path configuration");
  }

  if (req.file) {
    // Single file upload
    const result = await uploadToCloudinary(
      req.file.buffer,
      req.uploadFolderPath,
      req.file.originalname
    );

    req.file = {
      filename: result.public_id,
      path: result.secure_url,
      size: req.file.size,
      mimetype: `image/${result.format}`,
      originalname: req.file.originalname,
    };
  } else if (req.files && req.files.length > 0) {
    // Multiple files upload - save original files first
    const originalFiles = [...req.files];

    const uploadPromises = originalFiles.map((file) =>
      uploadToCloudinary(file.buffer, req.uploadFolderPath, file.originalname)
    );
    const results = await Promise.all(uploadPromises);

    req.files = results.map((result, index) => ({
      filename: result.public_id,
      path: result.secure_url,
      size: originalFiles[index].size,
      mimetype: `image/${result.format}`,
      originalname: originalFiles[index].originalname,
    }));
  }
};

// Middleware upload cho từng entity
const uploadMiddleware = {
  // Các middleware upload cơ bản
  uploadProductImages: createMultiUploadMiddleware(
    "products/images",
    "images",
    10
  ),
  uploadVariantImages: createMultiUploadMiddleware(
    "products/variants",
    "images",
    10
  ),
  uploadBrandLogo: createSingleUploadMiddleware("brands", "logo"),
  uploadAvatar: createSingleUploadMiddleware("users/avatars", "avatar"),
  uploadBannerImage: createSingleUploadMiddleware("banners", "banner"),
  uploadSizeGuideImage: createSingleUploadMiddleware("size-guides", "image"),
  uploadSizeChartImage: createSingleUploadMiddleware(
    "size-guides/charts",
    "sizeChart"
  ),
  uploadMeasurementGuideImage: createSingleUploadMiddleware(
    "size-guides/measurements",
    "measurementGuide"
  ),
  uploadBlogThumbnail: createSingleUploadMiddleware(
    "blogs/thumbnails",
    "thumbnail"
  ),
  uploadBlogFeaturedImage: createSingleUploadMiddleware(
    "blogs/featured",
    "featuredImage"
  ),
  uploadBlogContentImage: createSingleUploadMiddleware(
    "blogs/content",
    "image"
  ),

  /**
   * Middleware upload file Excel
   */
  uploadExcelFile: (req, res, next) => {
    const storage = createStorage();
    const upload = multer({
      storage,
      limits: {
        fileSize: MAX_EXCEL_FILE_SIZE,
        files: 1,
        fields: 5,
      },
      fileFilter: excelFileFilter,
    }).single("file");

    upload(req, res, (err) => {
      if (err) {
        return next(err);
      }
      next();
    });
  },

  /**
   * Middleware upload multiple images for return request (1-5 images)
   */
  uploadReturnReasonImages: (req, res, next) => {
    const storage = createStorage();
    const upload = multer({
      storage,
      limits: {
        fileSize: MAX_FILE_SIZE,
        files: 5, // Tối đa 5 ảnh
        fields: 20,
      },
      fileFilter,
    }).array("images", 5); // Field name là 'images', max 5 files

    upload(req, res, (err) => {
      if (err) {
        return next(err);
      }
      next();
    });
  },

  /**
   * Middleware xử lý lỗi upload
   * @param {Error} err - Lỗi từ multer
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware
   */
  handleUploadError: (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        throw new ApiError(
          400,
          `Kích thước file không được vượt quá ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB`
        );
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        throw new ApiError(400, "Số lượng file vượt quá giới hạn cho phép");
      }
      if (err.code === "LIMIT_FIELD_COUNT") {
        throw new ApiError(400, "Số lượng field vượt quá giới hạn cho phép");
      }
      if (err.code === "LIMIT_PART_COUNT") {
        throw new ApiError(
          400,
          "Số lượng part trong form-data vượt quá giới hạn"
        );
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        throw new ApiError(
          400,
          "Field không hợp lệ hoặc số lượng file vượt quá giới hạn"
        );
      }
      if (err.code === "LIMIT_FIELD_KEY") {
        throw new ApiError(400, "Tên field quá dài hoặc không hợp lệ");
      }
      if (err.code === "LIMIT_FIELD_VALUE") {
        throw new ApiError(400, "Giá trị field quá dài");
      }
      if (err.message && err.message.includes("field name")) {
        throw new ApiError(
          400,
          "Tên field không được để trống hoặc chứa ký tự không hợp lệ"
        );
      }
      throw new ApiError(400, `Lỗi upload: ${err.message}`);
    }

    if (err) {
      if (err.message && err.message.includes("Field name không hợp lệ")) {
        throw new ApiError(
          400,
          "Tên field chứa ký tự không được phép hoặc để trống"
        );
      }
      throw new ApiError(400, err.message);
    }

    next();
  },
};

// Export helper function
uploadMiddleware.processCloudinaryUpload = processCloudinaryUpload;

module.exports = uploadMiddleware;
