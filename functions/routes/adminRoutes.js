const express = require("express");
const router = express.Router();

// 1. Middlewares
const { protect, authorize } = require("../middleware/authMiddleware");

// 2. Controllers
const vtuController = require("../controllers/vtuController");
const adminController = require("../controllers/adminController");
const dataPlanController = require("../controllers/dataPlanController");
// Na kara Notification controller don routes dinka su yi kyau
const notificationController = require("../controllers/notificationController");

// --- ADMIN ROUTES (Private/Admin Only) ---

// Duk wani route da yake karkashin wannan, sai Admin ne kawai zai iya taba shi
router.use(protect);
router.use(authorize("admin"));

// 1. Notification Management
router.post("/send-notification", notificationController.createNotification);
router.get("/all-notifications", notificationController.getNotifications);

// 2. Data Plan & Pricing
router.post("/set-plan", dataPlanController.setPlanPrice);
router.get("/get-plans", dataPlanController.getPlans); // Don Admin ya ga duka plans din

// 3. User & Role Management
router.get("/users", vtuController.getAllUsers);
router.put("/update-role", vtuController.updateUserRole);
router.put("/suspend-user/:id", adminController.suspendUser); // Kar ka manta da wannan don tsaro!

// 4. Hierarchy Management (Supervisors & Agents)
router.get("/supervisors", adminController.getSupervisors);
router.get("/agents", adminController.getAgents);
router.put("/assign-target", adminController.assignTarget);

// 5. Support & Financial Oversight
router.get("/support-activities", adminController.getSupportActivities);
router.get("/pending-refunds", adminController.getPendingRefunds);
router.put("/approve-refund/:id", adminController.approveRefund);

module.exports = router;
