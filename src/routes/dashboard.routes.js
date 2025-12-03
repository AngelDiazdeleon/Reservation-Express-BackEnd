const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

// ✅ Ruta para estadísticas del dashboard (solo admin)
router.get('/stats', 
  requireAuth, 
  requireRole('admin'), 
  dashboardController.getDashboardStats
);

// ✅ Ruta para estadísticas de host
router.get('/host-stats',
  requireAuth,
  requireRole('host'),
  async (req, res) => {
    try {
      // Aquí puedes implementar stats específicas para hosts
      res.json({
        success: true,
        message: 'Estadísticas para host',
        userId: req.user.id
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas'
      });
    }
  }
);

module.exports = router;