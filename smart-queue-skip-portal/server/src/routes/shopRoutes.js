import express from "express";
import { getShops } from "../controllers/shopController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getShops);

export default router;
