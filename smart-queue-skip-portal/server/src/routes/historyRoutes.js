import express from "express";
import { getAdminHistory } from "../controllers/adminController.js";
import { getMyHistory } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { createHistoryEntry, getRequestContext } from "../services/historyService.js";
import { sendResponse } from "../utils/sendResponse.js";

const router = express.Router();

router.use(protect);
router.get("/", getMyHistory);
router.post("/", async (req, res, next) => {
  try {
    const historyContext = getRequestContext(req);
    const entry = await createHistoryEntry({
      userId: req.body.userId || req.user._id,
      actionType: req.body.actionType || req.body.action_type,
      details: req.body.details || {},
      ...historyContext,
    });

    sendResponse(res, 201, "History created successfully", { history: entry });
  } catch (error) {
    next(error);
  }
});
router.get("/admin", authorizeRoles("admin"), getAdminHistory);

export default router;
