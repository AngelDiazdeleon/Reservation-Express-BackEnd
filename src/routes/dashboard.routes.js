const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller'); // 👈 Añade esto

// Reemplaza la ruta actual con:
router.get('/stats', dashboardController.getDashboardStats);

module.exports = router;