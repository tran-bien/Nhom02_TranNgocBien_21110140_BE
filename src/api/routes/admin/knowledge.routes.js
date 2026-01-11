const express = require("express");
const router = express.Router();
const knowledgeController = require("@controllers/admin/knowledge.controller");
const {
  protect,
  requireStaffOrAdmin,
  requireAdminOnly,
} = require("@middlewares/auth.middleware");
const validateRequest = require("@middlewares/validateRequest");
const { uploadExcelFile } = require("@middlewares/upload.middleware");
const {
  validateGetAllDocuments,
  validateGetDocumentById,
  validateCreateDocument,
  validateUpdateDocument,
  validateDeleteDocument,
  validateExcelImport,
} = require("@validators/knowledge.validator");

/**
 * Tất cả routes cần auth
 */
router.use(protect);

// ============================================================
// CRITICAL: Specific routes PHẢI đặt TRƯỚC routes có params
// Nếu không, Express sẽ match "/statistics" với "/:id"
// ============================================================

/**
 * @route   GET /api/v1/admin/knowledge-base/statistics
 * @desc    Get Knowledge Base statistics
 * @access  Admin/Staff
 */
router.get(
  "/statistics",
  requireStaffOrAdmin,
  knowledgeController.getStatistics
);

/**
 * Excel Import Routes
 */

/**
 * @route   GET /api/v1/admin/knowledge-base/excel/template
 * @desc    Download Excel template for knowledge base import
 * @access  Admin/Staff
 */
router.get(
  "/excel/template",
  requireStaffOrAdmin,
  knowledgeController.downloadExcelTemplate
);

/**
 * @route   POST /api/v1/admin/knowledge-base/excel/validate
 * @desc    Validate Excel file before import
 * @access  Admin/Staff
 */
router.post(
  "/excel/validate",
  requireStaffOrAdmin,
  uploadExcelFile,
  knowledgeController.validateExcelFile
);

/**
 * @route   POST /api/v1/admin/knowledge-base/excel/import
 * @desc    Import knowledge base from Excel file
 * @access  Admin/Staff
 */
router.post(
  "/excel/import",
  requireStaffOrAdmin,
  uploadExcelFile,
  validateExcelImport,
  validateRequest,
  knowledgeController.importFromExcel
);

/**
 * @route   DELETE /api/v1/admin/knowledge-base/excel/clear-training
 * @desc    Clear all Excel training data (for demo)
 * @access  Admin/staff
 */
router.delete(
  "/excel/clear-training",
  requireStaffOrAdmin,
  knowledgeController.clearExcelTraining
);

/**
 * @route   DELETE /api/v1/admin/knowledge-base/clear-all
 * @desc    Clear ALL knowledge documents (DANGEROUS - Admin Only)
 * @access  Admin/staff
 */
router.delete(
  "/clear-all",
  requireStaffOrAdmin,
  knowledgeController.clearAllDocuments
);

// ============================================================
// General CRUD Routes (có params - đặt SAU)
// ============================================================

/**
 * @route   GET /api/v1/admin/knowledge-base
 * @desc    Lấy danh sách knowledge documents
 * @access  Admin/Staff (Read)
 */
router.get(
  "/",
  requireStaffOrAdmin,
  validateGetAllDocuments,
  validateRequest,
  knowledgeController.getAllDocuments
);

/**
 * @route   POST /api/v1/admin/knowledge-base
 * @desc    Tạo knowledge document mới
 * @access  Admin/Staff (CRUD)
 */
router.post(
  "/",
  requireStaffOrAdmin,
  validateCreateDocument,
  validateRequest,
  knowledgeController.createDocument
);

/**
 * @route   GET /api/v1/admin/knowledge-base/:id
 * @desc    Lấy chi tiết knowledge document
 * @access  Admin/Staff (Read)
 */
router.get(
  "/:id",
  requireStaffOrAdmin,
  validateGetDocumentById,
  validateRequest,
  knowledgeController.getDocumentById
);

/**
 * @route   PUT /api/v1/admin/knowledge-base/:id
 * @desc    Cập nhật knowledge document
 * @access  Admin/Staff (CRUD)
 */
router.put(
  "/:id",
  requireStaffOrAdmin,
  validateUpdateDocument,
  validateRequest,
  knowledgeController.updateDocument
);

/**
 * @route   DELETE /api/v1/admin/knowledge-base/:id
 * @desc    Xóa knowledge document
 * @access  Admin/Staff
 */
router.delete(
  "/:id",
  requireStaffOrAdmin,
  validateDeleteDocument,
  validateRequest,
  knowledgeController.deleteDocument
);

module.exports = router;
