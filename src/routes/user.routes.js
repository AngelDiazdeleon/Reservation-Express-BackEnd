// routes/user.routes.js
const { Router } = require("express");
const { requireAuth } = require("../middleware/auth.js");
const { profile, updateProfile, deleteProfile } = require("../controllers/auth.controller.js");

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

// Obtener perfil del usuario
router.get("/profile", profile);

// Actualizar perfil del usuario
router.post("/profile", updateProfile);

// Eliminar perfil del usuario
router.delete("/profile", deleteProfile);

module.exports = router;