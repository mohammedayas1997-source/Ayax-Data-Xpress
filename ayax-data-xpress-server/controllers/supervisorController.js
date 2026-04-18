const User = require("../models/User");
const Sale = require("../models/Sale");

// @desc    Dauko dukkan Agents na wannan Supervisor din
// @route   GET /api/v1/supervisor/my-agents
// @access  Private/Supervisor
exports.getMyAgents = async (req, res) => {
  try {
    const supervisorId = req.user._id;

    // 1. Nemo dukkan agents dake karkashin wannan supervisor din
    const agents = await User.find({
      assignedSupervisor: supervisorId,
      role: "agent",
    }).select("name email phone targets");

    // 2. Nemo stats na target daga profile din supervisor din kansa
    const supervisor = await User.findById(supervisorId);

    // 3. Lissafa total GB da aka sayar a wannan watan (misali na April 2026)
    // Wannan lissafi ne na dukkan sales da agents dinsa suka yi
    const sales = await Sale.find({ supervisorId });
    const totalGB = sales.reduce((acc, sale) => acc + sale.dataAmountGB, 0);

    res.status(200).json({
      success: true,
      stats: {
        totalRegistered: agents.length,
        totalDataSold: totalGB,
        monthlyGoal: supervisor.targets.agentGoal,
        dataGoal: supervisor.targets.dataGoal,
      },
      agents,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
