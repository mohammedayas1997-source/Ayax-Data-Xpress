const User = require("../models/User");
const Sale = require("../models/Sale");

// @desc    Get Agent performance and potential bonus
// @route   GET /api/v1/agent/my-performance
exports.getAgentPerformance = async (req, res) => {
  try {
    const agentId = req.user._id;
    const agent = await User.findById(agentId);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlySales = await Sale.aggregate([
      {
        $match: {
          agentId: agentId,
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
    const targetMet = performance.totalGB >= (agent.targets?.dataGoal || 0);

    if (targetMet && performance.totalGB > 0) {
      bonusAmount = performance.totalSalesValue * 0.05;
    }

    res.status(200).json({
      success: true,
      data: {
        targets: agent.targets,
        currentProgress: {
          totalGB: performance.totalGB,
          totalSales: performance.totalSalesValue,
        },
        bonusStatus: {
          isTargetMet: targetMet,
          potentialBonus: bonusAmount,
          instruction: targetMet
            ? "Target achieved! Your bonus will be credited at the end of the month."
            : `Sell ${(agent.targets?.dataGoal || 0) - performance.totalGB}GB more to unlock your bonus.`,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
