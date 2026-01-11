const { KnowledgeDocument } = require("@models");
const GeminiService = require("@services/gemini.service");
const ApiError = require("@utils/ApiError");
const ExcelTemplateGenerator = require("@utils/excelTemplate");
const ExcelValidator = require("@utils/excelValidator");
const mongoose = require("mongoose");

/**
 * Helper: Validate array of MongoIds
 */
const validateMongoIds = (ids, fieldName) => {
  if (!Array.isArray(ids)) return [];

  const validIds = [];
  for (const id of ids) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      validIds.push(id);
    }
  }
  return validIds;
};

const knowledgeService = {
  /**
   * Lấy danh sách knowledge documents với filter và pagination
   */
  async getAllDocuments(query) {
    const { category, isActive, search, page = 1, limit = 20 } = query;

    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    // Text search
    if (search && search.trim().length > 0) {
      filter.$text = { $search: search };
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: search
        ? { score: { $meta: "textScore" } }
        : { priority: -1, createdAt: -1 },
      populate: [{ path: "metadata.lastUpdatedBy", select: "name email" }],
    };

    if (search) {
      options.projection = { score: { $meta: "textScore" } };
    }

    const skip = (options.page - 1) * options.limit;
    const documents = await KnowledgeDocument.find(filter)
      .populate(options.populate)
      .sort(options.sort)
      .skip(skip)
      .limit(options.limit);

    const total = await KnowledgeDocument.countDocuments(filter);

    return {
      success: true,
      data: {
        data: documents,
        pagination: {
          page: options.page,
          limit: options.limit,
          total,
          pages: Math.ceil(total / options.limit),
        },
      },
    };
  },

  /**
   * Lấy chi tiết knowledge document theo ID
   */
  async getDocumentById(id) {
    const document = await KnowledgeDocument.findById(id).populate(
      "metadata.lastUpdatedBy",
      "name email"
    );

    if (!document) {
      throw new ApiError(404, "Không tìm thấy knowledge document");
    }

    return {
      success: true,
      data: document,
    };
  },

  /**
   * Tạo knowledge document mới
   */
  async createDocument(data, userId) {
    const { category, title, content, tags, priority, metadata } = data;

    // Tạo metadata
    const sanitizedMetadata = {
      source: "manual",
      lastUpdatedBy: userId,
    };

    const document = await KnowledgeDocument.create({
      category,
      title,
      content,
      tags: tags || [],
      priority: priority || 1,
      metadata: sanitizedMetadata,
      isActive: true,
    });

    // Clear Gemini cache
    GeminiService.clearCache();

    return {
      success: true,
      data: document,
      message: "Tạo knowledge document thành công",
    };
  },

  /**
   * Cập nhật knowledge document
   */
  async updateDocument(id, data, userId) {
    const document = await KnowledgeDocument.findById(id);

    if (!document) {
      throw new ApiError(404, "Không tìm thấy knowledge document");
    }

    // Update fields
    const allowedFields = [
      "category",
      "title",
      "content",
      "tags",
      "priority",
      "isActive",
    ];
    allowedFields.forEach((field) => {
      if (data[field] !== undefined) {
        document[field] = data[field];
      }
    });

    // Update metadata
    document.metadata = {
      ...document.metadata,
      lastUpdatedBy: userId,
    };

    await document.save();

    // Clear Gemini cache
    GeminiService.clearCache();

    return {
      success: true,
      data: document,
      message: "Cập nhật knowledge document thành công",
    };
  },

  /**
   * Xóa knowledge document
   */
  async deleteDocument(id) {
    const document = await KnowledgeDocument.findById(id);

    if (!document) {
      throw new ApiError(404, "Không tìm thấy knowledge document");
    }

    await document.deleteOne();

    // Clear cache
    GeminiService.clearCache();

    return {
      success: true,
      message: "Xóa knowledge document thành công",
    };
  },

  /**
   * Generate Excel template
   */
  async generateExcelTemplate() {
    const workbook = await ExcelTemplateGenerator.generateTemplate();
    return workbook;
  },

  /**
   * Validate Excel file
   */
  async validateExcelFile(fileBuffer) {
    const result = await ExcelValidator.validate(fileBuffer);

    return {
      success: true,
      data: {
        totalRows: result.totalRows,
        validRows: result.validRows,
        errorRows: result.errorRows,
        errors: result.errors,
        warnings: result.warnings,
        preview: result.validDocuments.slice(0, 5),
      },
      message:
        result.errorRows > 0
          ? `Tìm thấy ${result.errorRows} lỗi. Vui lòng kiểm tra và sửa lại.`
          : `File hợp lệ! Sẵn sàng import ${result.validRows} documents.`,
    };
  },

  /**
   * Import knowledge base from Excel
   */
  async importFromExcel(fileBuffer, userId, skipDuplicates = true) {
    // Parse Excel file
    const documentsToImport = await ExcelValidator.parse(fileBuffer);

    // Add metadata
    const documentsWithMeta = documentsToImport.map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        source: "excel_import",
        lastUpdatedBy: userId,
      },
      isActive: true,
    }));

    let imported = 0;
    let skipped = 0;

    // Import documents
    if (skipDuplicates) {
      for (const doc of documentsWithMeta) {
        const existing = await KnowledgeDocument.findOne({ title: doc.title });
        if (existing) {
          skipped++;
        } else {
          await KnowledgeDocument.create(doc);
          imported++;
        }
      }
    } else {
      const result = await KnowledgeDocument.insertMany(documentsWithMeta);
      imported = result.length;
    }

    // Clear Gemini cache
    GeminiService.clearCache();

    return {
      success: true,
      data: {
        totalRows: documentsToImport.length,
        imported,
        skipped,
      },
      message: `Import thành công ${imported} documents${
        skipped > 0 ? `, bỏ qua ${skipped} documents trùng lặp` : ""
      }`,
    };
  },

  /**
   * Xóa Excel training data
   */
  async clearExcelTraining() {
    const result = await KnowledgeDocument.deleteMany({
      "metadata.source": "excel_import",
    });

    // Clear cache
    GeminiService.clearCache();

    return {
      success: true,
      data: {
        deleted: result.deletedCount,
      },
      message: `Đã xóa ${result.deletedCount} documents từ Excel training`,
      warning: "⚠️ AI bây giờ chưa được train!",
    };
  },

  /**
   * Xóa toàn bộ Knowledge Base
   */
  async clearAllDocuments() {
    const result = await KnowledgeDocument.deleteMany({});

    // Clear cache
    GeminiService.clearCache();

    return {
      success: true,
      data: {
        deleted: result.deletedCount,
      },
      message: `Đã xóa ${result.deletedCount} documents`,
      warning: "AI bây giờ sẽ không có kiến thức để trả lời!",
    };
  },

  /**
   * Thống kê Knowledge Base
   */
  async getStatistics() {
    const total = await KnowledgeDocument.countDocuments();
    const active = await KnowledgeDocument.countDocuments({ isActive: true });
    const inactive = total - active;

    // Statistics by category
    const byCategory = await KnowledgeDocument.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Statistics by source
    const bySource = await KnowledgeDocument.aggregate([
      { $group: { _id: "$metadata.source", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Recently updated
    const recentUpdates = await KnowledgeDocument.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("title category updatedAt")
      .populate("metadata.lastUpdatedBy", "name");

    return {
      success: true,
      data: {
        total,
        active,
        inactive,
        byCategory,
        bySource,
        recentUpdates,
      },
    };
  },
};

module.exports = knowledgeService;
