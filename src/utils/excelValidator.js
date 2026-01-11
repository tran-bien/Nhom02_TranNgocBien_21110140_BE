const XLSX = require("xlsx");
const ApiError = require("@utils/ApiError");

/**
 * Excel Validator for Knowledge Base Import
 */
class ExcelValidator {
  static VALID_CATEGORIES = [
    "category_info",
    "policy",
    "faq",
    "brand_info",
    "product_info",
    "how_to_size",
  ];

  /**
   * Validate Excel file buffer
   */
  static async validate(fileBuffer) {
    // Read Excel file
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      throw new ApiError(400, "File Excel không có dữ liệu");
    }

    const errors = [];
    const warnings = [];
    const validDocuments = [];

    // Validate each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // Excel row number (header is row 1)
      const rowErrors = [];

      // Required field validation
      if (!row["Category (*)"]) {
        rowErrors.push("Category là bắt buộc");
      } else if (!this.VALID_CATEGORIES.includes(row["Category (*)"])) {
        rowErrors.push(`Category không hợp lệ: ${row["Category (*)"]}`);
      }

      if (!row["Title (*)"]) {
        rowErrors.push("Title là bắt buộc");
      } else if (row["Title (*)"].length > 200) {
        rowErrors.push("Title không được quá 200 ký tự");
      }

      if (!row["Content (*)"]) {
        rowErrors.push("Content là bắt buộc");
      } else if (row["Content (*)"].length > 5000) {
        rowErrors.push("Content không được quá 5000 ký tự");
      }

      // Priority validation
      if (row["Priority (1-10)"]) {
        const priority = parseInt(row["Priority (1-10)"]);
        if (isNaN(priority) || priority < 1 || priority > 10) {
          rowErrors.push("Priority phải là số từ 1-10");
        }
      }

      if (rowErrors.length > 0) {
        errors.push({
          row: rowNumber,
          errors: rowErrors,
        });
      } else {
        // Parse tags
        const tags = row["Tags (phân cách bằng dấu ;)"]
          ? row["Tags (phân cách bằng dấu ;)"]
              .split(";")
              .map((t) => t.trim())
              .filter((t) => t)
          : [];

        validDocuments.push({
          category: row["Category (*)"],
          title: row["Title (*)"],
          content: row["Content (*)"],
          tags,
          priority: row["Priority (1-10)"]
            ? parseInt(row["Priority (1-10)"])
            : 1,
        });

        // Warnings
        if (!row["Priority (1-10)"]) {
          warnings.push({
            row: rowNumber,
            message: "Priority không được điền, sẽ dùng giá trị mặc định là 1",
          });
        }
      }
    }

    return {
      totalRows: data.length,
      validRows: validDocuments.length,
      errorRows: errors.length,
      errors,
      warnings,
      validDocuments,
    };
  }

  /**
   * Parse Excel file for import
   */
  static async parse(fileBuffer) {
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      throw new ApiError(400, "File Excel không có dữ liệu");
    }

    const documentsToImport = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2;

      try {
        // Validation
        if (
          !row["Category (*)"] ||
          !this.VALID_CATEGORIES.includes(row["Category (*)"])
        ) {
          throw new Error("Category không hợp lệ");
        }
        if (!row["Title (*)"] || row["Title (*)"].length > 200) {
          throw new Error("Title không hợp lệ");
        }
        if (!row["Content (*)"] || row["Content (*)"].length > 5000) {
          throw new Error("Content không hợp lệ");
        }

        // Parse data
        const tags = row["Tags (phân cách bằng dấu ;)"]
          ? row["Tags (phân cách bằng dấu ;)"]
              .split(";")
              .map((t) => t.trim())
              .filter((t) => t)
          : [];

        const priority = row["Priority (1-10)"]
          ? parseInt(row["Priority (1-10)"])
          : 1;
        if (priority < 1 || priority > 10) {
          throw new Error("Priority phải từ 1-10");
        }

        documentsToImport.push({
          category: row["Category (*)"],
          title: row["Title (*)"],
          content: row["Content (*)"],
          tags,
          priority,
        });
      } catch (error) {
        errors.push({
          row: rowNumber,
          error: error.message,
        });
      }
    }

    if (errors.length > 0) {
      throw new ApiError(
        400,
        `Có ${errors.length} lỗi trong file Excel`,
        errors
      );
    }

    return documentsToImport;
  }
}

module.exports = ExcelValidator;
