const express = require("express");
const router = express.Router();

// Shigo da dukkan ayyukan (functions) daga controller
const {
  getLeaderDashboard,
  assignSupervisorTarget,
  downloadSupervisorReport,
  assignAgentToSupervisor,
  unassignAgent,
  toggleSupervisorStatus,
  createNewSupervisor,
  getAutomaticFullReport,
  getAllAgents,
} = require("../controllers/leaderController");

// GYARA: Mun tabbatar da sunan authMiddleware don gudun kuskure a Vercel
const { protect, authorize } = require("../middleware/authMiddleware");

// Dukkan hanyoyin Leader suna bukatar kariya
router.use(protect);

// --- 1. Dashboard & Management ---
// Mun bar 'admin' a nan domin kaima Admin ne za ka iya ganin komai
router.get("/dashboard", authorize("leader", "admin"), getLeaderDashboard);
router.get("/all-agents", authorize("leader", "admin"), getAllAgents);

// --- 2. Supervisor Control ---
router.post(
  "/create-supervisor",
  authorize("leader", "admin"),
  createNewSupervisor,
);

router.patch(
  "/toggle-status/:supervisorId",
  authorize("leader", "admin"),
  toggleSupervisorStatus,
);

// --- 3. Target & Reporting ---
router.post(
  "/assign-target",
  authorize("leader", "admin"),
  assignSupervisorTarget,
);

router.get(
  "/download-report/:supervisorId",
  authorize("leader", "admin"),
  downloadSupervisorReport,
);

router.get(
  "/full-report",
  authorize("leader", "admin"),
  getAutomaticFullReport,
);

// --- 4. Agent Management ---
router.post(
  "/assign-agent",
  authorize("leader", "admin"),
  assignAgentToSupervisor,
);

router.post("/unassign-agent", authorize("leader", "admin"), unassignAgent);

module.exports = router;
