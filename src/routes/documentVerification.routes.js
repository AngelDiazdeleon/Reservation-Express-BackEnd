const express = require('express');
const router = express.Router();
const documentVerificationController = require('../controllers/documentVerification.controller');
const { upload, handleMulterError } = require('../middleware/uploadMiddleware');
const { requireAuth } = require('../middleware/auth'); // ✅ Asegúrate de tener esto

// ✅ PROTEGER TODAS LAS RUTAS CON AUTENTICACIÓN
router.use(requireAuth);

// Subir documentos
router.post(
  '/upload',
  upload.array('documents', 10),
  handleMulterError,
  documentVerificationController.uploadDocuments
);

// Descargar documento - YA ESTÁ PROTEGIDA POR router.use(requireAuth)
router.get(
  '/download/:id',
  documentVerificationController.downloadDocument
);

// Obtener documentos del usuario
router.get(
  '/user-documents',
  documentVerificationController.getUserDocuments
);

// Obtener documento por ID
router.get(
  '/:id',
  documentVerificationController.getDocumentById
);

// Eliminar documento
router.delete(
  '/:id',
  documentVerificationController.deleteDocument
);

// Actualizar estado del documento
router.put(
  '/update-status/:id',
  documentVerificationController.updateDocumentStatus
);

module.exports = router;