const User = require("../models/User");
const Transaction = require("../models/Transaction"); // Muna bukatar wannan don records
const axios = require("axios");

// @desc    Get current user's wallet balance
// @route   GET /api/v1/wallet/balance
// @access  Private
exports.getBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      balance: user.walletBalance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Initialize Paystack Payment
// @route   POST /api/v1/wallet/initialize
// @access  Private
exports.initializePayment = async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findById(req.user.id);

    // Paystack tana karbar kudi ne a matsayin Kobo (N1 = 100 Kobo)
    const amountInKobo = amount * 100;

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: user.email,
        amount: amountInKobo,
        metadata: {
          userId: user._id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    res.status(200).json({
      success: true,
      data: response.data.data, // Wannan zai bayar da 'authorization_url'
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Payment initialization failed" });
  }
};

// @desc    Verify Paystack Payment and Fund Wallet
// @route   GET /api/v1/wallet/verify/:reference
// @access  Private
exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    if (response.data.data.status === "success") {
      const amountInNaira = response.data.data.amount / 100;
      const userId = response.data.data.metadata.userId;

      // 1. Nemo User
      const user = await User.findById(userId);

      // 2. Kara kudi a Wallet
      user.walletBalance += amountInNaira;
      await user.save();

      // 3. Yi record din transaction
      await Transaction.create({
        user: userId,
        type: "deposit",
        amount: amountInNaira,
        status: "success",
        reference: reference,
      });

      res.status(200).json({
        success: true,
        message: "Wallet funded successfully!",
        balance: user.walletBalance,
      });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Payment not successful" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Verification error" });
  }
};

// @desc    Credit wallet (Simulated for development - KEEP FOR TESTING ONLY)
exports.fundWalletManual = async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findById(req.user.id);
    user.walletBalance += Number(amount);
    await user.save();

    res.status(200).json({
      success: true,
      message: `Simulated funding successful`,
      newBalance: user.walletBalance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
