const User = require("../models/User");
const Transaction = require("../models/Transaction");
const axios = require("axios");
const DataPlan = require("../models/DataPlan");
const Sale = require("../models/Sale"); // Mun tabbatar da muna amfani da Sale model na asali

/**
 * @desc    Purchase Mobile Data with Agent Target Tracking
 */
exports.buyData = async (req, res) => {
  try {
    const { network, planId, phoneNumber } = req.body;
    const userId = req.user._id; // Amfani da _id ya fi tabbas

    const [user, plan] = await Promise.all([
      User.findById(userId),
      DataPlan.findOne({
        networkId: String(network),
        planCode: String(planId),
      }),
    ]);

    if (!plan) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid data plan selected" });
    }

    const finalPrice = user.role === "agent" ? plan.agentPrice : plan.userPrice;

    if (user.walletBalance < finalPrice) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient wallet balance" });
    }

    // 1. Create Transaction (Pending)
    const transaction = await Transaction.create({
      user: user._id,
      type: "data",
      amount: finalPrice,
      phoneNumber,
      status: "pending",
    });

    // 2. Kira ClubKonnect API
    const response = await axios.get(
      `${process.env.CLUBKONNECT_BASE_URL}/Data.asp`,
      {
        params: {
          UserID: process.env.CLUBKONNECT_USERID,
          APIKey: process.env.CLUBKONNECT_APIKEY,
          MobileNetwork: network,
          DataPlan: planId,
          MobileNumber: phoneNumber,
          RequestID: `AyaxData_${Date.now()}`,
        },
        timeout: 30000, // Tabbatar cewa API bai wuce sakan 30 ba
      },
    );

    if (
      response.data.status === "ORDER_RECEIVED" ||
      response.data.status === "SUCCESS"
    ) {
      // Update User Wallet (Atomic operation)
      await User.findByIdAndUpdate(userId, {
        $inc: { walletBalance: -finalPrice },
      });

      transaction.status = "success";
      transaction.reference = response.data.order_id || "CK_SUCCESS";
      await transaction.save();

      // 3. TARGET TRACKING: Idan agent ne, a yi record na tallan sa
      if (user.role === "agent" && user.assignedSupervisor) {
        await Sale.create({
          agentId: user._id,
          supervisorId: user.assignedSupervisor,
          dataAmountGB: Number(plan.sizeGB) || 0,
          planName: plan.planLabel,
          amount: finalPrice,
        });
      }

      return res.status(200).json({
        success: true,
        message: `Successfully sent ${plan.planLabel} to ${phoneNumber}`,
      });
    } else {
      transaction.status = "failed";
      await transaction.save();
      return res.status(400).json({
        success: false,
        message:
          response.data.remarks ||
          "The network provider is currently unavailable",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal transaction error",
      error: error.message,
    });
  }
};

/**
 * @desc    Purchase Mobile Airtime
 */
exports.buyAirtime = async (req, res) => {
  try {
    const { network, phoneNumber, amount } = req.body;
    const userId = req.user._id;
    const amountNum = Number(amount);

    const user = await User.findById(userId);
    if (user.walletBalance < amountNum) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient wallet balance" });
    }

    const transaction = await Transaction.create({
      user: userId,
      type: "airtime",
      amount: amountNum,
      phoneNumber,
      status: "pending",
    });

    const response = await axios.get(
      `${process.env.CLUBKONNECT_BASE_URL}/Airtime.asp`,
      {
        params: {
          UserID: process.env.CLUBKONNECT_USERID,
          APIKey: process.env.CLUBKONNECT_APIKEY,
          MobileNetwork: network,
          Amount: amountNum,
          MobileNumber: phoneNumber,
          RequestID: `AyaxAir_${Date.now()}`,
        },
        timeout: 30000,
      },
    );

    if (
      response.data.status === "ORDER_RECEIVED" ||
      response.data.status === "SUCCESS"
    ) {
      await User.findByIdAndUpdate(userId, {
        $inc: { walletBalance: -amountNum },
      });
      transaction.status = "success";
      transaction.reference = response.data.order_id || "CK_AIR_SUCCESS";
      await transaction.save();

      return res
        .status(200)
        .json({ success: true, message: "Airtime purchase successful" });
    } else {
      transaction.status = "failed";
      await transaction.save();
      return res.status(400).json({
        success: false,
        message: response.data.remarks || "Airtime provider error",
      });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Airtime processing error" });
  }
};

// ... (Ragowar methods din kamar verifyMeter suma su bi wannan tsarin na timeout da error handling)

/**
 * @desc    NIMC Identity Validation
 */
exports.nimcValidation = async (req, res) => {
  try {
    const { nin } = req.body;
    const cost = 1000; // Price per NIN check
    const user = await User.findById(req.user._id);

    if (user.walletBalance < cost) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance (N1,000 required)",
      });
    }

    const response = await axios.post(
      process.env.NIMC_API_ENDPOINT,
      {
        api_key: process.env.NIMC_API_KEY,
        nin,
      },
      { timeout: 40000 },
    );

    if (response.data.status === "success") {
      await User.findByIdAndUpdate(user._id, {
        $inc: { walletBalance: -cost },
      });
      return res
        .status(200)
        .json({ success: true, data: response.data.slip_details });
    }
    return res
      .status(400)
      .json({ success: false, message: "NIMC Verification Failed" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "NIMC service error" });
  }
};

/**
 * @desc    Get Transaction History
 */
exports.getTransactionHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean(); // Faster performance

    return res
      .status(200)
      .json({ success: true, count: transactions.length, data: transactions });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Could not fetch history" });
  }
};
