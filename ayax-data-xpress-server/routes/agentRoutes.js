const express = require("express");
const router = express.Router();
const { getAgentPerformance } = require("../controllers/agentController");
const { protect, authorize } = require("../middleware/auth");

router.get("/my-performance", protect, authorize("agent"), getAgentPerformance);

module.exports = router;
