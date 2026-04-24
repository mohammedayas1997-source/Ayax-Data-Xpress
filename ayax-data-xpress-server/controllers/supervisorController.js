const User = require("../models/User");
const Sale = require("../models/Sale");

// @desc    Get All Supervisors and Overall Network Stats
// @route   GET /api/v1/leader/dashboard
// @access  Private/Leader
exports.getLeaderDashboard = async (req, res) => {
  try {
    const leaderId = req.user._id;

    // 1. Nemo dukkan Supervisors da suke ƙarƙashin wannan Leader ɗin
    // (Ko kuma dukkan Supervisors idan kai ne babban Leader ɗaya tilo)
    const supervisors = await User.find({ role: "supervisor" }).select(
      "surname firstName phone email targets",
    );

    // 2. Kididdigar gaba ɗaya (Network-wide Stats)
    // Muna son mu ga nawa ne aka sayar a dukkan rassanmu
    const networkSales = await Sale.aggregate([
      { $group: { _id: null, overallGB: { $sum: "$dataAmountGB" } } },
    ]);

    const overallGB = networkSales.length > 0 ? networkSales[0].overallGB : 0;

    // 3. Nemo yawan Agents a dukkan rukunoni
    const totalAgentsCount = await User.countDocuments({ role: "agent" });

    // 4. Shirya bayanan kowane Supervisor don Dashboard
    const supervisorDetails = await Promise.all(
      supervisors.map(async (sup) => {
        // Nemo nawa ne agents ɗin kowane supervisor
        const myAgentsCount = await User.countDocuments({
          assignedSupervisor: sup._id,
          role: "agent",
        });

        // Nemo nawa ne team ɗin wannan supervisor suka sayar
        const teamSales = await Sale.aggregate([
          { $match: { supervisorId: sup._id } },
          { $group: { _id: null, teamGB: { $sum: "$dataAmountGB" } } },
        ]);

        return {
          id: sup._id,
          name: `${sup.surname} ${sup.firstName}`,
          phone: sup.phone,
          teamSize: myAgentsCount,
          teamPerformance: teamSales.length > 0 ? teamSales[0].teamGB : 0,
          targetAmount: sup.targets?.dataGoal || 0,
        };
      }),
    );

    res.status(200).json({
      success: true,
      networkStats: {
        totalSupervisors: supervisors.length,
        totalAgents: totalAgentsCount,
        overallDataSold: overallGB,
        month: "April 2026",
      },
      supervisors: supervisorDetails,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Network Error: Could not fetch leader dashboard data",
      error: error.message,
    });
  }
};
