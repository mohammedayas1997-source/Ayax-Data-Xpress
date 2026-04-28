const User = require("../models/User");
const { Parser } = require("json2csv");
const TargetHistory = require("../models/TargetHistory");
const mongoose = require("mongoose");

// @desc    Leader assigns target to a Supervisor
// @route   POST /api/v1/leader/assign-target
exports.assignSupervisorTarget = async (req, res) => {
  try {
    const { supervisorId, dataGoal, agentGoal, month } = req.body;

    const supervisor = await User.findOne({
      _id: supervisorId,
      role: "supervisor",
    });

    if (!supervisor) {
      return res
        .status(404)
        .json({ success: false, message: "Supervisor not found" });
    }

    // Safety check don targets object
    if (!supervisor.targets) supervisor.targets = {};

    supervisor.targets.dataGoal = dataGoal || supervisor.targets.dataGoal || 0;
    supervisor.targets.agentGoal =
      agentGoal || supervisor.targets.agentGoal || 0;
    supervisor.targets.currentMonth =
      month ||
      supervisor.targets.currentMonth ||
      new Date().toLocaleString("default", { month: "long" });

    supervisor.assignedLeader = req.user._id;

    await supervisor.save();

    res.status(200).json({
      success: true,
      message: `Target assigned successfully`,
      targets: supervisor.targets,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Download Report as CSV
exports.downloadSupervisorReport = async (req, res) => {
  try {
    const { supervisorId } = req.params;
    const history = await TargetHistory.find({ assignedTo: supervisorId })
      .sort("-createdAt")
      .lean();

    if (!history.length) {
      return res
        .status(404)
        .json({ success: false, message: "No history found" });
    }

    const fields = [
      "month",
      "dataGoal",
      "achievedData",
      "agentGoal",
      "achievedAgents",
      "status",
    ];
    const parser = new Parser({ fields });
    const csv = parser.parse(history);

    res.header("Content-Type", "text/csv");
    res.attachment(`Report_${supervisorId}.csv`);
    return res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Toggle Supervisor Status (Active/Suspended)
exports.toggleSupervisorStatus = async (req, res) => {
  try {
    const { supervisorId } = req.params;
    const user = await User.findById(supervisorId);

    if (!user)
      return res.status(404).json({ success: false, message: "Not found" });

    user.isSuspended = !user.isSuspended;
    await user.save();

    res.json({
      success: true,
      message: `Supervisor is now ${user.isSuspended ? "Suspended" : "Active"}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create New Supervisor
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
      assignedLeader: req.user._id,
    });
    res.status(201).json({ success: true, data: newSup });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Get Detailed Stats for Leader Dashboard
exports.getLeaderDashboard = async (req, res) => {
  try {
    const leaderId = new mongoose.Types.ObjectId(req.user._id);

    const supervisors = await User.find({
      role: "supervisor",
      assignedLeader: leaderId,
    }).lean();

    const supDetails = await Promise.all(
      supervisors.map(async (sup) => {
        const agentsCount = await User.countDocuments({
          role: "agent",
          assignedSupervisor: sup._id,
        });

        return {
          id: sup._id,
          name: sup.name,
          phone: sup.phone,
          isSuspended: sup.isSuspended,
          teamSize: agentsCount,
          targets: sup.targets || {},
        };
      }),
    );

    const totalAgentsCount = await User.countDocuments({ role: "agent" });

    res.status(200).json({
      success: true,
      networkStats: {
        totalSupervisors: supervisors.length,
        totalAgents: totalAgentsCount,
      },
      supervisors: supDetails,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Assign Agent to Supervisor
exports.assignAgentToSupervisor = async (req, res) => {
  try {
    const { agentId, supervisorId } = req.body;
    const agent = await User.findOneAndUpdate(
      { _id: agentId, role: "agent" },
      { assignedSupervisor: supervisorId },
      { new: true },
    );

    if (!agent)
      return res
        .status(404)
        .json({ success: false, message: "Agent not found" });

    res
      .status(200)
      .json({ success: true, message: "Agent assigned successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get All Agents
exports.getAllAgents = async (req, res) => {
  try {
    const agents = await User.find({ role: "agent" })
      .populate("assignedSupervisor", "name")
      .select("name phone assignedSupervisor")
      .lean();

    res.status(200).json({ success: true, agents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
