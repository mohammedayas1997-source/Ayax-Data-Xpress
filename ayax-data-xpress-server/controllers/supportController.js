const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Activity = require("../models/Activity");
// @desc    Search for any user by Phone or Email
// @route   GET /api/v1/support/search-user/:identifier
// @access  Private/Support
exports.searchUser = async (req, res) => {
  try {
    const { identifier } = req.params;

    const user = await User.findOne({
      $or: [{ phone: identifier }, { email: identifier }],
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with the provided identifier",
      });
    }

    const history = await Transaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: {
        profile: user,
        recentTransactions: history,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Initiate a refund request (Pending Admin Approval)
// @route   POST /api/v1/support/request-refund
// @access  Private/Support
exports.requestRefund = async (req, res) => {
  try {
    const { transactionId, reason } = req.body;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    if (["refunded", "pending-refund"].includes(transaction.status)) {
      return res
        .status(400)
        .json({ success: false, message: "Refund already active" });
    }

    transaction.status = "pending-refund";
    transaction.refundReason = reason;
    transaction.requestedBy = req.user._id;
    await transaction.save();

    // LOG THE ACTION FOR ADMIN
    await Activity.create({
      staffId: req.user._id,
      action: "REFUND_REQUEST",
      details: `Requested refund for Transaction ID: ${transactionId}`,
      targetUser: transaction.userId,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Refund request logged and sent for approval",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
