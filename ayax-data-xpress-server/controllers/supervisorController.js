const User = require("../models/User");
const Sale = require("../models/Sale");

// @desc    Get all Agents assigned to this Supervisor with full details
// @route   GET /api/v1/supervisor/my-agents
// @access  Private/Supervisor
exports.getMyAgents = async (req, res) => {
  try {
    const supervisorId = req.user._id;

    // 1. Fetch agents with full professional details (Phone, Address, and Image)
    // We select fields needed for real-life tracking and contact
    const agents = await User.find({
      assignedSupervisor: supervisorId,
      role: "agent",
    }).select(
      "surname firstName otherName email phone address state lga profileImage targets",
    );

    // 2. Fetch supervisor's own target data
    const supervisor = await User.findById(supervisorId);

    // 3. Professional Stats Calculation
    // Using aggregation for better performance in a real-life environment
    const salesStats = await Sale.aggregate([
      { $match: { supervisorId: supervisorId } },
      { $group: { _id: null, totalGB: { $sum: "$dataAmountGB" } } },
    ]);

    const totalGB = salesStats.length > 0 ? salesStats[0].totalGB : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalRegistered: agents.length,
        totalDataSold: totalGB,
        monthlyGoal: supervisor.targets?.agentGoal || 0,
        dataGoal: supervisor.targets?.dataGoal || 0,
        currentMonth: supervisor.targets?.currentMonth || "April 2026",
      },
      agents: agents.map((agent) => ({
        ...agent._doc,
        // Ensure address is formatted nicely if displayed in a list
        fullAddress: `${agent.address}, ${agent.lga}, ${agent.state}`,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve agent data",
      error: error.message,
    });
  }
};
