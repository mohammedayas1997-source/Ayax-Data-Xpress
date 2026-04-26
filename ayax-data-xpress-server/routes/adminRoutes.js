const express = require("express");
const router = express.Router();

// 1. Import daga vtuController
const {
  setPlanPrice,
  getAllUsers,
  updateUserRole,
} = require("../controllers/vtuController");

// 2. Import daga adminController (Mun tabbatar duka functions suna nan yanzu)
const {
  assignTarget,
  getSupervisors,
  getAgents,
  approveRefund,
  getSupportActivities,
} = require("../controllers/adminController");

// 3. Import Middlewares
const { protect, authorize } = require("../middleware/authMiddleware");

// 4. Import Model
const Notification = require("../models/Notification");

// Middleware don duba idan mai shigowa Admin ne
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Admins only." });
  }
};

// --- NOTIFICATION MANAGEMENT ---
router.post("/send-notification", protect, adminOnly, async (req, res) => {
  try {
    const { title, message, type } = req.body;
    const notification = await Notification.create({ title, message, type });
    res.status(201).json({ success: true, notification });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error sending notification" });
  }
});

// --- PRICING & PLAN MANAGEMENT ---
router.post("/set-plan", protect, adminOnly, setPlanPrice);

// --- USER & ROLE MANAGEMENT ---
router.get("/users", protect, adminOnly, getAllUsers);
router.put("/update-role", protect, adminOnly, updateUserRole);

// --- AGENT & SUPERVISOR MANAGEMENT ---
// Route domin Admin ya ga dukkan supervisors
router.get("/supervisors", protect, adminOnly, getSupervisors);

// Route domin Admin ya ga dukkan agents
router.get("/agents", protect, adminOnly, getAgents);

// Route domin Admin ya sanya wa supervisor target
router.put("/assign-target", protect, adminOnly, assignTarget);

// --- SUPPORT & REFUND MANAGEMENT ---
// Amfani da authorize("admin") ko adminOnly duka zasu yi aiki
router.get(
  "/support-activities",
  protect,
  authorize("admin"),
  getSupportActivities,
);

router.put("/approve-refund/:id", protect, authorize("admin"), approveRefund);

module.exports = router;
