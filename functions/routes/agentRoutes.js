const express = require("express");
const router = express.Router();
const {
  getAgentPerformance,
  getAgentSalesHistory,
  getMySupervisor,
} = require("../controllers/agentController");

// Mun tabbatar da path din authMiddleware
const { protect, authorize } = require("../middleware/authMiddleware");

// --- AGENT ROUTES ---

// Duk wani route a nan, sai Agent ne kawai zai iya shiga
router.use(protect);
router.use(authorize("agent"));

// 1. Ganin yadda aka yi tallace-tallace (Total GB sold, Earnings, etc.)
router.get("/my-performance", getAgentPerformance);

// 2. Ganin takamaiman jerin tallan da aka yi kwanan nan
router.get("/sales-history", getAgentSalesHistory);

// 3. Ganin bayanan Supervisor (Phone number/Name) don tuntuba
router.get("/my-supervisor", getMySupervisor);

module.exports = router;
