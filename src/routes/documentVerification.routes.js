const express = require('express');
const router = express.Router();
const documentVerificationController = require('../controllers/documentVerificationController');
const { requireAuth, requireRole } = require('../middleware/auth');

// ✅ RUTA PARA ADMIN - Obtener documentos de cualquier usuario
router.get(
  '/admin/user-documents/:userId',
  requireAuth,
  requireRole('admin'),
  documentVerificationController.getUserDocumentsForAdmin
);

// ✅ RUTA PARA CAMBIAR ESTADO DE DOCUMENTOS (ADMIN)
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('admin'),
  documentVerificationController.updateDocumentStatus
);

// RUTA 2: Para usuarios - Obtener sus propios documentos
router.get(
  '/my-documents',
  requireAuth,
  documentVerificationController.getMyDocuments
);

// RUTA 3: Para ADMIN - Cambiar estado de documentos
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('admin'),
  documentVerificationController.updateDocumentStatus
);

// RUTA 4: Subir documentos
router.post(
  '/upload',
  requireAuth,
  upload.array('documents', 5), // Ajusta según tu middleware de upload
  documentVerificationController.uploadDocuments
);

// RUTA 5: Descargar documento
router.get(
  '/download/:id',
  requireAuth,
  documentVerificationController.downloadDocument
);

// RUTA 6: Eliminar documento
router.delete(
  '/:id',
  requireAuth,
  documentVerificationController.deleteDocument
);

// RUTA 7: Obtener documento por ID
router.get(
  '/:id',
  requireAuth,
  documentVerificationController.getDocumentById
);

module.exports = router;