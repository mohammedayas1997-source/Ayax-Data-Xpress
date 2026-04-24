const User = require("../models/User");
const { Parser } = require("json2csv");
const TargetHistory = require("../models/TargetHistory");

// @desc    Leader assigns target to a Supervisor
// @route   POST /api/v1/leader/assign-target
// @access  Private/Leader
exports.assignSupervisorTarget = async (req, res) => {
  try {
    const { supervisorId, dataGoal, agentGoal, month } = req.body;

    // 1. Nemo Supervisor din kuma ka tabbatar role dinsa daidai ne
    const supervisor = await User.findOne({
      _id: supervisorId,
      role: "supervisor",
    });

    if (!supervisor) {
      return res.status(404).json({
        success: false,
        message: "Supervisor not found",
      });
    }

    // 2. Update targets
    supervisor.targets.dataGoal = dataGoal || supervisor.targets.dataGoal;
    supervisor.targets.agentGoal = agentGoal || supervisor.targets.agentGoal;
    supervisor.targets.currentMonth = month || supervisor.targets.currentMonth;

    // 3. (Optional) Saita wanene Leader dinsa idan ba a riga an saita ba
    supervisor.assignedLeader = req.user._id;

    await supervisor.save();

    res.status(200).json({
      success: true,
      message: `Target assigned to ${supervisor.name} successfully`,
      targets: supervisor.targets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
exports.downloadSupervisorReport = async (req, res) => {
  try {
    const { supervisorId } = req.params;

    // 1. Nemo tarihin aiyukan supervisor din
    const history = await TargetHistory.find({ assignedTo: supervisorId }).sort(
      "-createdAt",
    );

    if (!history.length) {
      return res
        .status(404)
        .json({ success: false, message: "No history found" });
    }

    // 2. Tsara bayanan da za su fito a cikin Excel/CSV
    const fields = [
      "month",
      "dataGoal",
      "achievedData",
      "agentGoal",
      "achievedAgents",
      "status",
    ];
    const opts = { fields };

    const parser = new Parser(opts);
    const csv = parser.parse(history);

    // 3. Seta headers domin browser ta gane cewa file ne ake saukewa
    res.header("Content-Type", "text/csv");
    res.attachment(`Supervisor_Report_${supervisorId}.csv`);
    return res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.toggleSupervisorStatus = async (req, res) => {
  try {
    const { supervisorId } = req.params;
    const user = await User.findById(supervisorId);

    if (!user)
      return res.status(404).json({ success: false, message: "Not found" });

    user.isSuspended = !user.isSuspended; // Idan yana active zai koma suspended
    await user.save();

    res.json({
      success: true,
      message: `Supervisor status updated to ${user.isSuspended ? "Suspended" : "Active"}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
exports.createNewSupervisor = async (req, res) => {
  try {
    const { name, email, phone, password, address } = req.body;
    const newSup = await User.create({
      name,
      email,
      phone,
      password,
      address,
      role: "supervisor",
      assignedLeader: req.user._id, // Leader din da ya dauke shi
    });
    res.status(201).json({ success: true, data: newSup });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
exports.getAutomaticFullReport = async (req, res) => {
  try {
    // 1. Report na dukkan Supervisors
    const supervisorReport = await User.find({ role: "supervisor" }).select(
      "name phone email address isSuspended",
    );

    // 2. Report na dukkan Agents (Detailed)
    const agentReport = await User.aggregate([
      { $match: { role: "agent" } },
      {
        $lookup: {
          from: "sales",
          localField: "_id",
          foreignField: "agentId",
          as: "allSales",
        },
      },
      {
        $project: {
          name: 1,
          phone: 1,
          address: 1,
          totalGB: { $sum: "$allSales.dataAmountGB" },
          supervisorId: "$assignedSupervisor",
        },
      },
    ]);

    res.json({
      success: true,
      supervisors: supervisorReport,
      agents: agentReport,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Assign an Agent to a specific Supervisor
// @route   POST /api/v1/leader/assign-agent-to-supervisor
exports.assignAgentToSupervisor = async (req, res) => {
  try {
    const { agentId, supervisorId } = req.body;

    // Nemo Agent din sannan ka sauya masa Supervisor
    const agent = await User.findOneAndUpdate(
      { _id: agentId, role: "agent" },
      { assignedSupervisor: supervisorId },
      { new: true },
    );

    if (!agent)
      return res
        .status(404)
        .json({ success: false, message: "Agent not found" });

    res.status(200).json({
      success: true,
      message: `Agent assigned to ${supervisorId} successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Remove an Agent from a Supervisor (Unassign)
// @route   POST /api/v1/leader/unassign-agent
exports.unassignAgent = async (req, res) => {
  try {
    const { agentId } = req.body;

    const agent = await User.findOneAndUpdate(
      { _id: agentId, role: "agent" },
      { assignedSupervisor: null }, // Mun cire shi daga karkashin kowa
      { new: true },
    );

    res
      .status(200)
      .json({ success: true, message: "Agent unassigned successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
// ... (Saka dukkan wadancan codes din da ka turo a sama anan) ...

// @desc    Get Comprehensive Dashboard Stats for Leader
// @route   GET /api/v1/leader/dashboard
exports.getLeaderDashboard = async (req, res) => {
  try {
    // 1. Nemo dukkan Supervisors na wannan Leader din
    const supervisors = await User.find({
      role: "supervisor",
      assignedLeader: req.user._id,
    });

    // 2. Nemo Statistics na kowane Supervisor daki-daki
    const supDetails = await Promise.all(
      supervisors.map(async (sup) => {
        // Lissafo yawan agents dake karkashinsa
        const agentsCount = await User.countDocuments({
          role: "agent",
          assignedSupervisor: sup._id,
        });

        // Lissafo yawan GB da aka sayar (Aggregation daga Sales model)
        // Wannan zai dogara ne idan kana da Sales model
        const totalSales = await User.aggregate([
          { $match: { _id: sup._id } },
          {
            $lookup: {
              from: "sales",
              localField: "_id",
              foreignField: "supervisorId",
              as: "sales",
            },
          },
        ]);

        return {
          id: sup._id,
          name: sup.name,
          phone: sup.phone,
          address: sup.address,
          isSuspended: sup.isSuspended,
          teamSize: agentsCount,
          teamPerformance: sup.targets.dataGoal || 0,
          targets: sup.targets,
        };
      }),
    );

    // 3. Overall Stats
    const totalAgentsCount = await User.countDocuments({ role: "agent" });

    res.status(200).json({
      success: true,
      networkStats: {
        totalSupervisors: supervisors.length,
        totalAgents: totalAgentsCount,
        overallDataSold: 0, // Zaka iya hada lissafin dukkan sales anan
      },
      supervisors: supDetails,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get All Agents for Management Picker
// @route   GET /api/v1/leader/all-agents
exports.getAllAgents = async (req, res) => {
  try {
    const agents = await User.find({ role: "agent" })
      .populate("assignedSupervisor", "name")
      .select("name phone assignedSupervisor");

    res.status(200).json({
      success: true,
      agents,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
