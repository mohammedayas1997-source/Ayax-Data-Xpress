const User = require("../models/User");

// @desc    Assign monthly targets to a Supervisor
// @route   PUT /api/v1/admin/assign-target
// @access  Private/Admin
exports.assignTarget = async (req, res) => {
  try {
    const { supervisorId, agentGoal, dataGoal, month } = req.body;

    const supervisor = await User.findById(supervisorId);

    if (!supervisor || supervisor.role !== "supervisor") {
      return res.status(404).json({
        success: false,
        message: "Supervisor not found with the provided ID",
      });
    }

    // Initialize targets object if it doesn't exist
    if (!supervisor.targets) {
      supervisor.targets = {};
    }

    // Update targets dynamically
    supervisor.targets = {
      agentGoal:
        agentGoal !== undefined ? agentGoal : supervisor.targets.agentGoal,
      dataGoal: dataGoal !== undefined ? dataGoal : supervisor.targets.dataGoal,
      currentMonth:
        month ||
        supervisor.targets.currentMonth ||
        new Date().toLocaleString("default", { month: "long" }),
    };

    await supervisor.save();

    res.status(200).json({
      success: true,
      message: `Target successfully assigned to ${supervisor.surname} ${supervisor.firstName}`,
      data: supervisor.targets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error during target assignment",
      error: error.message,
    });
  }
};

// @desc    Fetch all Supervisors for Admin overview
// @route   GET /api/v1/admin/supervisors
// @access  Private/Admin
exports.getSupervisors = async (req, res) => {
  try {
    const supervisors = await User.find({ role: "supervisor" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: supervisors.length,
      data: supervisors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch supervisors",
      error: error.message,
    });
  }
};

// @desc    Get all registered Agents including their verification photos
// @route   GET /api/v1/admin/agents
// @access  Private/Admin
exports.getAgents = async (req, res) => {
  try {
    // This will fetch all agents and include their names, location, and base64 profile image
    const agents = await User.find({ role: "agent" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: agents.length,
      data: agents,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving agents list",
      error: error.message,
    });
  }
};
