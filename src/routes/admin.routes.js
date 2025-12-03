const express = require('express');
const router = express.Router();
const PublicationRequestController = require('../controllers/publicationRequest.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const controller = new PublicationRequestController();

// 🔹 RUTAS ESPECÍFICAS PARA ADMINISTRADORES - Gestión de permisos
router.get('/pending-terraces', 
  requireAuth, 
  requireRole('admin'), 
  controller.getPendingForAdmin
);

module.exports = router;