const express = require("express");
const router = express.Router();
const { getMyAgents } = require("../controllers/supervisorController");
const { protect } = require("../middleware/authMiddleware");

// Middleware don duba idan Supervisor ne
const supervisorOnly = (req, res, next) => {
  if (
    req.user &&
    (req.user.role === "supervisor" || req.user.role === "admin")
  ) {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Supervisors only." });
  }
};

router.get("/my-agents", protect, supervisorOnly, getMyAgents);

module.exports = router;
