const asyncHandler = require("express-async-handler");
const knowledgeService = require("@services/knowledge.service");

const knowledgeController = {
  /**
   * @route GET /api/v1/admin/knowledge-base
   * @desc Lấy danh sách knowledge documents
   */
  getAllDocuments: asyncHandler(async (req, res) => {
    const result = await knowledgeService.getAllDocuments(req.query);
    return res.json(result);
  }),

  /**
   * @route GET /api/v1/admin/knowledge-base/:id
   * @desc Lấy chi tiết knowledge document
   */
  getDocumentById: asyncHandler(async (req, res) => {
    const result = await knowledgeService.getDocumentById(req.params.id);
    return res.json(result);
  }),

  /**
   * @route POST /api/v1/admin/knowledge-base
   * @desc Tạo knowledge document mới
   */
  createDocument: asyncHandler(async (req, res) => {
    const result = await knowledgeService.createDocument(
      req.body,
      req.user._id
    );
    return res.status(201).json(result);
  }),

  /**
   * @route PUT /api/v1/admin/knowledge-base/:id
   * @desc Cập nhật knowledge document
   */
  updateDocument: asyncHandler(async (req, res) => {
    const result = await knowledgeService.updateDocument(
      req.params.id,
      req.body,
      req.user._id
    );
    return res.json(result);
  }),

  /**
   * @route DELETE /api/v1/admin/knowledge-base/:id
   * @desc Xóa knowledge document
   */
  deleteDocument: asyncHandler(async (req, res) => {
    const result = await knowledgeService.deleteDocument(req.params.id);
    return res.json(result);
  }),

  /**
   * @route GET /api/v1/admin/knowledge-base/excel/template
   * @desc Download Excel template
   */
  downloadExcelTemplate: asyncHandler(async (req, res) => {
    const workbook = await knowledgeService.generateExcelTemplate();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=knowledge_base_template.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  }),

  /**
   * @route POST /api/v1/admin/knowledge-base/excel/validate
   * @desc Validate Excel file before import
   */
  validateExcelFile: asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng upload file Excel",
      });
    }

    const result = await knowledgeService.validateExcelFile(req.file.buffer);
    return res.json(result);
  }),

  /**
   * @route POST /api/v1/admin/knowledge-base/excel/import
   * @desc Import knowledge base from Excel
   */
  importFromExcel: asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng upload file Excel",
      });
    }

    const { skipDuplicates = true } = req.body;
    const result = await knowledgeService.importFromExcel(
      req.file.buffer,
      req.user._id,
      skipDuplicates
    );

    return res.status(201).json(result);
  }),

  /**
   * @route DELETE /api/v1/admin/knowledge-base/excel/clear-training
   * @desc Clear Excel training data
   */
  clearExcelTraining: asyncHandler(async (req, res) => {
    const result = await knowledgeService.clearExcelTraining();
    return res.json(result);
  }),

  /**
   * @route DELETE /api/v1/admin/knowledge-base/clear-all
   * @desc Clear all Knowledge Base
   */
  clearAllDocuments: asyncHandler(async (req, res) => {
    const result = await knowledgeService.clearAllDocuments();
    return res.json(result);
  }),

  /**
   * @route GET /api/v1/admin/knowledge-base/statistics
   * @desc Get Knowledge Base statistics
   */
  getStatistics: asyncHandler(async (req, res) => {
    const result = await knowledgeService.getStatistics();
    return res.json(result);
  }),
};

module.exports = knowledgeController;
