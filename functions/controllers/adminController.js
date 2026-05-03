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

// @desc    Fetch all Supervisors for Admin overview
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
    res.status(500).json({
      success: false,
      message: "Failed to fetch supervisors",
      error: error.message,
    });
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
    res.status(500).json({
      success: false,
      message: "Error retrieving agents list",
      error: error.message,
    });
  }
};

// @desc    Approve refund and log finalization
const approveRefund = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction || transaction.status !== "pending-refund") {
      return res.status(400).json({
        success: false,
        message: "No pending refund request found for this transaction",
      });
    }

    const userId = transaction.user || transaction.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User for this transaction not found",
      });
    }

    // Atomic update
    user.walletBalance += Number(transaction.amount);
    transaction.status = "refunded";
    transaction.approvedBy = req.user._id;
    transaction.resolvedAt = Date.now();

    await user.save();
    await transaction.save();

    await Activity.create({
      staffId: req.user._id,
      action: "REFUND_APPROVED",
      details: `Approved refund of ${transaction.amount} for Transaction ${transaction._id}`,
      targetUser: user._id,
    });

    res.status(200).json({
      success: true,
      message: "Refund approved and activity logged",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all users for Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update User Role
const updateUserRole = async (req, res) => {
  try {
    const { userId, role } = req.body;
    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true },
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get support activities
const getSupportActivities = async (req, res) => {
  try {
    const activities = await Activity.find()
      .populate("staffId", "surname firstName email")
      .populate("targetUser", "surname firstName phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Standardized Export Block ---
// MUN GYARA NAN: Dole dukkan ayyukan su fito ta nan
module.exports = {
  assignTarget,
  getSupervisors,
  getAgents,
  approveRefund,
  getSupportActivities,
  getAllUsers, // Na kara wannan
  updateUserRole, // Na kara wannan
};
