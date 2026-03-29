import express from "express";
import { getAvailableSlots } from "../controllers/slotController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getAvailableSlots);

export default router;
