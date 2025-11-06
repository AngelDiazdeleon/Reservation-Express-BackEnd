import express from "express";
import { auth, authRole } from "../middleware/auth.js";
import {
  createReservation,
  confirmReservation,
} from "controllers/reservation.controller.js";

const router = express.Router();

router.post("/", auth, createReservation); // cliente
router.patch("/:id/confirm", auth, authRole("admin"), confirmReservation); // admin

export default router;
