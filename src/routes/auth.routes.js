// auth.routers.js
import { Router } from "express";
import {
  register,
  login,
  profile
} from "../controllers/auth.controller.js";
import { auth } from "../middleware/auth.js";

const router = Router();

// Registro de usuario (client, host, admin)
router.post("/register", register);

// Login y generación de token
router.post("/login", login);

// Perfil del usuario autenticado
router.get("/me", auth, profile);

export default router;
