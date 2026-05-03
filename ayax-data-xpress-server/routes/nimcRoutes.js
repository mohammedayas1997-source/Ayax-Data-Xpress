// routes/nimcRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  submitNIMCRequest,
  getMyNIMCRequests,
} = require("../controllers/nimcController");

// Duka wadannan layukan suna bukatar user ya kasance ya yi login
router.use(protect);

// User zai tura sabon aiki
router.post("/submit", submitNIMCRequest);

// User zai duba tarihin ayyukansa (History)
router.get("/my-requests", getMyNIMCRequests);

module.exports = router;
