const express = require("express");
const router = express.Router();

// 1. Import Controllers
const {
  searchUser,
  requestRefund,
  getUserTransactionHistory, // Sabo
  getRefundStatus, // Sabo
} = require("../controllers/supportController");

// 2. Import Middlewares
const { protect, authorize } = require("../middleware/authMiddleware");

// --- SUPPORT ROUTES ---

// Duk wani route a nan, sai Support Staff ko Admin
router.use(protect);
router.use(authorize("support", "admin"));

// 1. Neman user ta amfani da Email ko Phone Number
router.get("/search-user/:identifier", searchUser);

// 2. Duba tarihin kudin user (Transactions) don tabbatar da koke-koke
router.get("/user-transactions/:userId", getUserTransactionHistory);

// 3. Neman refund idan an samu matsalar network
router.post("/request-refund", requestRefund);

// 4. Duba halin da refund yake ciki (Pending/Approved/Rejected)
router.get("/refund-status/:transactionId", getRefundStatus);

// 3. Export the router
module.exports = router;
