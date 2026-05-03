const express = require("express");
const router = express.Router();

// 1. Middlewares
const { protect, authorize } = require("../middleware/authMiddleware");

// 2. Controllers
// Tabbatar sunayen fayilolin sun yi daidai da yadda suke a folder (Case-sensitive)
const adminController = require("../controllers/adminController");
const dataPlanController = require("../controllers/dataPlanController");
const notificationController = require("../controllers/notificationController");

// --- ADMIN ROUTES ---
router.use(protect);
router.use(authorize("admin"));

// 1. Notification Management
router.post("/send-notification", notificationController.createNotification);
router.get("/all-notifications", notificationController.getNotifications);

// 2. Data Plan & Pricing
router.post("/set-plan", dataPlanController.setPlanPrice);
router.get("/get-plans", dataPlanController.getPlans);

// 3. User & Role Management (An dawo da su karkashin adminController domin sune a ciki)
router.get("/users", adminController.getAllUsers);
router.put("/update-role", adminController.updateUserRole);
router.put("/suspend-user/:id", adminController.suspendUser);

// 4. Hierarchy Management
router.get("/supervisors", adminController.getSupervisors);
router.get("/agents", adminController.getAgents);
router.put("/assign-target", adminController.assignTarget);

// 5. Support & Financial Oversight
router.get("/support-activities", adminController.getSupportActivities);
router.get("/pending-refunds", adminController.getPendingRefunds);
router.put("/approve-refund/:id", adminController.approveRefund);

module.exports = router;
