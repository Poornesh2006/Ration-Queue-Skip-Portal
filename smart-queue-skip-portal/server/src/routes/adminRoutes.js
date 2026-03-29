import express from "express";
import {
  adminLogin,
  createManagedShop,
  createProduct,
  deleteProduct,
  getAdminAnalytics,
  getAdminHistory,
  getAdminOverview,
  getAdminReport,
  getArchives,
  getAuditLogs,
  getFraudCases,
  getManagedShops,
  getManagedUsers,
  getProducts,
  getQueueMonitoring,
  sendAdminNotification,
  toggleUserBlock,
  updateManagedShop,
  updateProduct,
  verifyUserIdentity,
} from "../controllers/adminController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { validateRequiredFields } from "../middleware/validateMiddleware.js";

const router = express.Router();

router.post("/login", validateRequiredFields(["adminId", "password"]), adminLogin);

router.use(protect, authorizeRoles("admin"));

router.get("/overview", getAdminOverview);
router.get("/analytics", getAdminAnalytics);
router.get("/history", getAdminHistory);
router.get("/report", getAdminReport);
router.get("/products", getProducts);
router.post(
  "/products",
  validateRequiredFields(["name", "sku", "category"]),
  createProduct
);
router.put("/products/:productId", updateProduct);
router.delete("/products/:productId", deleteProduct);

router.get("/users", getManagedUsers);
router.patch("/users/:userId/block", toggleUserBlock);
router.patch("/users/:userId/verify", verifyUserIdentity);

router.get("/shops", getManagedShops);
router.post(
  "/shops",
  validateRequiredFields(["shopId", "shopName", "location"]),
  createManagedShop
);
router.put("/shops/:shopId", updateManagedShop);

router.get("/fraud", getFraudCases);
router.get("/archives", getArchives);
router.get("/queue", getQueueMonitoring);
router.get("/audit-logs", getAuditLogs);
router.post(
  "/notifications",
  validateRequiredFields(["title", "message"]),
  sendAdminNotification
);

export default router;
