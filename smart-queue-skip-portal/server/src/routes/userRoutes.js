import express from "express";
import { getCurrentUser, getMyHistory, getUsers } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/me", protect, getCurrentUser);
router.get("/history", protect, getMyHistory);
router.get("/", protect, authorizeRoles("admin"), getUsers);

export default router;
