const mongoose = require("mongoose"); // Na kara wannan don ObjectId
const User = require("../models/User");
const Sale = require("../models/Sale");

// @desc    Get Agent performance and potential bonus
// @route   GET /api/v1/agent/my-performance
exports.getAgentPerformance = async (req, res) => {
  try {
    const agentId = req.user._id;

    // MUHIMMI: Tabbatar da agentId ya zama ObjectId don Aggregate yayi aiki lafiya
    const agentObjectId = new mongoose.Types.ObjectId(agentId);

    const agent = await User.findById(agentId);

    if (!agent) {
      return res
        .status(404)
        .json({ success: false, message: "Agent not found" });
    }

    // Lissafin farkon wata (1st of the current month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Aggregate don lissafin tallace-tallace
    const monthlySales = await Sale.aggregate([
      {
        $match: {
          agentId: agentObjectId, // Mun yi amfani da ObjectId a nan
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalGB: { $sum: "$dataAmountGB" },
          totalSalesValue: { $sum: "$amount" },
        },
      },
    ]);

    const performance =
      monthlySales.length > 0
        ? monthlySales[0]
        : { totalGB: 0, totalSalesValue: 0 };

    let bonusAmount = 0;

    // Safety check don targets
    const dataGoal = agent.targets?.dataGoal || 0;
    const targetMet = performance.totalGB >= dataGoal;

    if (targetMet && performance.totalGB > 0) {
      // 5% bonus logic
      bonusAmount = performance.totalSalesValue * 0.05;
    }

    res.status(200).json({
      success: true,
      data: {
        targets: agent.targets || { dataGoal: 0, agentGoal: 0 },
        currentProgress: {
          totalGB: performance.totalGB,
          totalSales: performance.totalSalesValue,
        },
        bonusStatus: {
          isTargetMet: targetMet,
          potentialBonus: bonusAmount,
          instruction: targetMet
            ? "Target achieved! Your bonus will be credited at the end of the month."
            : `Sell ${(dataGoal - performance.totalGB).toFixed(2)}GB more to unlock your bonus.`,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching performance data",
      error: error.message,
    });
  }
};
