const express = require("express");
const router = express.Router();
const multer = require("multer"); // Don karbar hoto
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../config/cloudinary"); // Tabbatar kana da wannan config din

// 1. Middlewares
const { protect, authorize } = require("../middleware/authMiddleware");

// 2. Controllers
const adminController = require("../controllers/adminController");
const dataPlanController = require("../controllers/dataPlanController");
const notificationController = require("../controllers/notificationController");
const nimcController = require("../controllers/nimcController"); // Sabon Controller

// --- SETTING UP MULTER FOR SLIP UPLOAD ---
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "nimc_slips",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});
const upload = multer({ storage: storage });

// --- ADMIN ROUTES ---
router.use(protect);
router.use(authorize("admin"));

// 1. Notification Management
router.post("/send-notification", notificationController.createNotification);
router.get("/all-notifications", notificationController.getNotifications);

// 2. Data Plan & Pricing
router.post("/set-plan", dataPlanController.setPlanPrice);
router.get("/get-plans", dataPlanController.getPlans);

// 3. User & Role Management
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

// --- 6. NIMC MANAGEMENT ROUTES (SABABBI) ---
// Admin zai ga dukkan ayyukan da aka turo
router.get("/nimc-requests", nimcController.getAllNIMCRequests);

// Admin zai sa aiki a 'processing'
router.put("/nimc-processing/:id", nimcController.updateToProcessing);

// Admin zai yi upload din slip kuma ya kammala aiki (Approved)
router.put(
  "/approve-nimc/:id",
  upload.single("slip"),
  nimcController.approveAndUploadSlip,
);

module.exports = router;
