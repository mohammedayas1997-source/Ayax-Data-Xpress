const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Activity = require("../models/Activity");

// @desc    Assign monthly targets to a Supervisor
// @route   PUT /api/v1/admin/assign-target
const assignTarget = async (req, res) => {
  try {
    const { supervisorId, agentGoal, dataGoal, month } = req.body;
    const supervisor = await User.findById(supervisorId);

    if (!supervisor || supervisor.role !== "supervisor") {
      return res.status(404).json({
        success: false,
        message: "Supervisor not found with the provided ID",
      });
    }

    if (!supervisor.targets) {
      supervisor.targets = {};
    }

    supervisor.targets = {
      agentGoal:
        agentGoal !== undefined ? agentGoal : supervisor.targets.agentGoal || 0,
      dataGoal:
        dataGoal !== undefined ? dataGoal : supervisor.targets.dataGoal || 0,
      currentMonth:
        month ||
        supervisor.targets.currentMonth ||
        new Date().toLocaleString("default", { month: "long" }),
    };

    await supervisor.save();

    res.status(200).json({
      success: true,
      message: `Target successfully assigned to ${supervisor.surname || ""} ${supervisor.firstName || ""}`,
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

// @desc    Fetch all Supervisors
const getSupervisors = async (req, res) => {
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all registered Agents
const getAgents = async (req, res) => {
  try {
    const agents = await User.find({ role: "agent" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: agents.length,
      data: agents,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve refund
const approveRefund = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction || transaction.status !== "pending-refund") {
      return res.status(400).json({
        success: false,
        message: "No pending refund request found",
      });
    }

    const userId = transaction.user || transaction.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Process Refund
    user.walletBalance += Number(transaction.amount);
    transaction.status = "refunded";
    transaction.approvedBy = req.user._id;
    transaction.resolvedAt = Date.now();

    await user.save();
    await transaction.save();

    // Log activity
    await Activity.create({
      staffId: req.user._id,
      action: "REFUND_APPROVED",
      details: `Refunded ${transaction.amount} for TX: ${transaction._id}`,
      targetUser: user._id,
    });

    res.status(200).json({ success: true, message: "Refund approved" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Role
const updateUserRole = async (req, res) => {
  try {
    const { userId, role } = req.body;
    const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Suspend User
const suspendUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    user.status = user.status === "suspended" ? "active" : "suspended";
    await user.save();

    res
      .status(200)
      .json({ success: true, message: `User is now ${user.status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get activities
const getSupportActivities = async (req, res) => {
  try {
    const activities = await Activity.find()
      .populate("staffId", "surname firstName email")
      .populate("targetUser", "surname firstName phone")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get pending refunds
const getPendingRefunds = async (req, res) => {
  try {
    const transactions = await Transaction.find({ status: "pending-refund" })
      .populate("user", "surname firstName phone")
      .sort({ createdAt: -1 });
    res
      .status(200)
      .json({ success: true, count: transactions.length, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Duka ayyukan ana fitar dasu anan don amfani a Router
module.exports = {
  assignTarget,
  getSupervisors,
  getAgents,
  approveRefund,
  getAllUsers,
  updateUserRole,
  suspendUser,
  getSupportActivities,
  getPendingRefunds,
};
