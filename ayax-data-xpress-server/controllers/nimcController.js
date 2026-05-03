const User = require("../models/User");
const Transaction = require("../models/Transaction");
const NIMCRequest = require("../models/NIMCRequest"); // Tabbatar kana da wannan Model din

// @desc    User submits a new NIMC modification request
// @route   POST /api/v1/nimc/submit
// @access  Private (User)
exports.submitNIMCRequest = async (req, res) => {
  try {
    const { type, nin, pin, amount, details } = req.body;
    const user = await User.findById(req.user.id).select("+pin +walletBalance");

    // 1. Duba PIN na User
    const isPinValid = await user.matchPin(pin);
    if (!isPinValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Transaction PIN" });
    }

    // 2. Duba idan yana da kudin aiki
    if (user.walletBalance < amount) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient wallet balance" });
    }

    // 3. Rage kudi a Wallet
    user.walletBalance -= amount;
    await user.save();

    // 4. Yi rajista a Transaction History
    await Transaction.create({
      user: user._id,
      amount,
      type: "nimc_service",
      description: `Payment for ${type}`,
      status: "success",
    });

    // 5. Adana Form din don Admin ya gani
    const request = await NIMCRequest.create({
      user: user._id,
      serviceType: type,
      ninNumber: nin,
      formData: details, // Dukkan bayanan da aka cike a form
      amount,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Request submitted successfully",
      data: request,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin fetches all pending and processing requests
// @route   GET /api/v1/admin/nimc-requests
// @access  Private (Admin)
exports.getAllNIMCRequests = async (req, res) => {
  try {
    const requests = await NIMCRequest.find()
      .populate("user", "surname firstName phone email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin marks request as 'processing'
// @route   PUT /api/v1/admin/nimc-processing/:id
// @access  Private (Admin)
exports.updateToProcessing = async (req, res) => {
  try {
    const request = await NIMCRequest.findByIdAndUpdate(
      req.params.id,
      { status: "processing" },
      { new: true },
    );

    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    }

    res.status(200).json({
      success: true,
      message: "Status updated to processing",
      data: request,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin uploads slip and completes request
// @route   PUT /api/v1/admin/approve-nimc/:id
// @access  Private (Admin)
exports.approveAndUploadSlip = async (req, res) => {
  try {
    // Duba idan Admin ya turo file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload the result slip",
      });
    }

    const request = await NIMCRequest.findById(req.params.id);
    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    }

    // Update Request status and add slip URL
    request.status = "completed";
    request.slipUrl = req.file.path; // Wannan link din daga Cloudinary/Multer yake fitowa
    request.resolvedAt = Date.now();

    await request.save();

    res.status(200).json({
      success: true,
      message: "Slip uploaded and request marked as completed",
      data: request,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    User fetches their own NIMC history
// @route   GET /api/v1/nimc/my-requests
// @access  Private (User)
exports.getMyNIMCRequests = async (req, res) => {
  try {
    const requests = await NIMCRequest.find({ user: req.user.id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
