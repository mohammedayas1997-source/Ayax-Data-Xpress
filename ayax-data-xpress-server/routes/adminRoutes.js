const express = require("express");
const router = express.Router();
const {
  setPlanPrice,
  getAllUsers,
  updateUserRole,
} = require("../controllers/vtuController");

// Import sabon controller din mu na Admin
const {
  assignTarget,
  getSupervisors,
} = require("../controllers/adminController");
const { protect } = require("../middleware/authMiddleware");
const Notification = require("../models/Notification"); // Tabbatar kana da wannan model din

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

// --- AGENT & SUPERVISOR TARGET MANAGEMENT ---
// Route domin Admin ya ga dukkan supervisors
router.get("/supervisors", protect, adminOnly, getSupervisors);

// Route domin Admin ya sanya wa supervisor target (Daga AssignTargetScreen)
router.put("/assign-target", protect, adminOnly, assignTarget);

module.exports = router;
