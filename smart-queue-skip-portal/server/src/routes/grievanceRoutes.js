import express from "express";
import {
  createGrievance,
  getGrievances,
} from "../controllers/grievanceController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { validateRequiredFields } from "../middleware/validateMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  validateRequiredFields(["category", "description"]),
  createGrievance
);
router.get("/", protect, authorizeRoles("admin"), getGrievances);

export default router;
