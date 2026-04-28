const mongoose = require("mongoose");
const User = require("../models/User");
const Sale = require("../models/Sale");

// @desc    Get All Supervisors and Overall Network Stats
// @route   GET /api/v1/leader/dashboard
// @access  Private/Leader
exports.getLeaderDashboard = async (req, res) => {
  try {
    // 1. Nemo dukkan Supervisors
    // Mun yi amfani da .lean() don koda ta yi sauri
    const supervisors = await User.find({ role: "supervisor" })
      .select("surname firstName phone email targets")
      .lean();

    // 2. Kididdigar gaba daya (Network-wide Stats)
    const networkSales = await Sale.aggregate([
      { $group: { _id: null, overallGB: { $sum: "$dataAmountGB" } } },
    ]);

    const overallGB = networkSales.length > 0 ? networkSales[0].overallGB : 0;

    // 3. Nemo yawan Agents a dukkan rukunoni
    const totalAgentsCount = await User.countDocuments({ role: "agent" });

    // 4. Optimization: Nemo team sales na kowa a kiran aggregate guda daya (maimakon kiran sa a loop)
    const allTeamSales = await Sale.aggregate([
      {
        $group: {
          _id: "$supervisorId",
          teamGB: { $sum: "$dataAmountGB" },
        },
      },
    ]);

    // Mayar da team sales din zuwa "Map" don mu nemo na kowa cikin sauki
    const salesMap = new Map(
      allTeamSales.map((item) => [String(item._id), item.teamGB]),
    );

    // 5. Shirya bayanan kowane Supervisor
    const supervisorDetails = await Promise.all(
      supervisors.map(async (sup) => {
        // Nemo nawa ne agents din kowane supervisor
        const myAgentsCount = await User.countDocuments({
          assignedSupervisor: sup._id,
          role: "agent",
        });

        return {
          id: sup._id,
          name: `${sup.surname || ""} ${sup.firstName || ""}`.trim(),
          phone: sup.phone,
          teamSize: myAgentsCount,
          teamPerformance: salesMap.get(String(sup._id)) || 0, // Nemo daga Map dinmu
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
        month: new Date().toLocaleString("default", {
          month: "long",
          year: "numeric",
        }),
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
