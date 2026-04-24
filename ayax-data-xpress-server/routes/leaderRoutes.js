const express = require("express");
const router = express.Router();

// Shigo da dukkan ayyukan (functions) daga controller
const {
  getLeaderDashboard,
  assignSupervisorTarget,
  downloadSupervisorReport,
  assignAgentToSupervisor,
  unassignAgent,
  toggleSupervisorStatus, // Kada ka manta da wannan don Suspending
  createNewSupervisor, // Don daukar sabon supervisor
  getAutomaticFullReport, // Don babban report
  getAllAgents, // Don lissafin agents a picker
} = require("../controllers/leaderController");

const { protect, authorize } = require("../middleware/auth");

// Dukkan hanyoyin Leader suna bukatar kariya (Protect)
router.use(protect);

// --- 1. Dashboard & Management ---
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
