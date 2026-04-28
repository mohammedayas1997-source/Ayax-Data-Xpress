const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Activity = require("../models/Activity");

// @desc    Search for any user by Phone or Email
// @route   GET /api/v1/support/search-user/:identifier
exports.searchUser = async (req, res) => {
  try {
    const { identifier } = req.params;

    // 1. Nemo User ta email ko phone
    const user = await User.findOne({
      $or: [{ phone: identifier }, { email: identifier }],
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with the provided identifier",
      });
    }

    // 2. Nemo tarihin Transactions
    // MUHIMMI: Tabbatar cewa Transaction model dinka yana amfani da 'user' ko 'userId'
    // Na saka duka biyun a matsayin kariya
    const history = await Transaction.find({
      $or: [{ user: user._id }, { userId: user._id }],
    })
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
    res.status(500).json({
      success: false,
      message: "Search failed",
      error: error.message,
    });
  }
};

// @desc    Initiate a refund request (Pending Admin Approval)
// @route   POST /api/v1/support/request-refund
exports.requestRefund = async (req, res) => {
  try {
    const { transactionId, reason } = req.body;

    if (!transactionId || !reason) {
      return res.status(400).json({
        success: false,
        message: "Please provide transaction ID and reason",
      });
    }

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    // Hana tura refund sau biyu
    if (["refunded", "pending-refund"].includes(transaction.status)) {
      return res.status(400).json({
        success: false,
        message: "Refund already processed or pending",
      });
    }

    // Sabunta Transaction status
    transaction.status = "pending-refund";
    transaction.refundReason = reason;
    transaction.requestedBy = req.user._id;
    await transaction.save();

    // LOG THE ACTION FOR ADMIN
    // Tabbatar targetUser yana daukar ID daidai daga transaction
    const targetUserId = transaction.user || transaction.userId;

    await Activity.create({
      staffId: req.user._id,
      action: "REFUND_REQUEST",
      details: `Requested refund for Transaction ID: ${transactionId}. Reason: ${reason}`,
      targetUser: targetUserId,
      ipAddress: req.ip || req.headers["x-forwarded-for"],
    });

    res.status(200).json({
      success: true,
      message: "Refund request logged and sent for approval",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Refund request failed",
      error: error.message,
    });
  }
};
