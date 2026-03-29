import express from "express";
import { getFraudInsights } from "../controllers/fraudController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", protect, authorizeRoles("admin"), getFraudInsights);

export default router;
