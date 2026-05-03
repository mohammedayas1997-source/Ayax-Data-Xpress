const express = require("express");
const router = express.Router();

// 1. Import Controllers (Tabbatar sunayen sun dace da na Controller file din)
const {
  searchUser,
  requestRefund,
  getUserTransactionHistory,
  getRefundStatus,
} = require("../controllers/supportController");

// 2. Import Middlewares
const { protect, authorize } = require("../middleware/authMiddleware");

// --- SUPPORT ROUTES ---
router.use(protect);
router.use(authorize("support", "admin", "superadmin")); // Na kara superadmin a nan

router.get("/search-user/:identifier", searchUser);
router.get("/user-transactions/:userId", getUserTransactionHistory);
router.post("/request-refund", requestRefund);
router.get("/refund-status/:transactionId", getRefundStatus);

module.exports = router;
