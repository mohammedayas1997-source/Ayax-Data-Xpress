const User = require("../models/User");
const Transaction = require("../models/Transaction");
const axios = require("axios");
const DataPlan = require("../models/DataPlan");
const Sale = require("../models/Transaction"); // Using Transaction as placeholder for Sale

/**
 * @desc    Purchase Mobile Data with Agent Target Tracking
 */
exports.buyData = async (req, res) => {
  try {
    const { network, planId, phoneNumber } = req.body;
    const userId = req.user.id;

    const [user, plan] = await Promise.all([
      User.findById(userId),
      DataPlan.findOne({ networkId: network, planCode: planId }),
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

    const transaction = await Transaction.create({
      user: user._id,
      type: "data",
      amount: finalPrice,
      phoneNumber,
      status: "pending",
    });

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
      },
    );

    if (
      response.data.status === "ORDER_RECEIVED" ||
      response.data.status === "SUCCESS"
    ) {
      user.walletBalance -= finalPrice;
      await user.save();
      transaction.status = "success";
      transaction.reference = response.data.order_id || "CK_SUCCESS";
      await transaction.save();

      if (user.role === "agent" && user.assignedSupervisor) {
        await Sale.create({
          agentId: user._id,
          supervisorId: user.assignedSupervisor,
          dataAmountGB: plan.sizeGB || 0,
          planName: plan.planLabel,
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
    return res
      .status(500)
      .json({ success: false, message: "An internal error occurred." });
  }
};

/**
 * @desc    Purchase Mobile Airtime
 */
exports.buyAirtime = async (req, res) => {
  try {
    const { network, phoneNumber, amount } = req.body;
    const user = await User.findById(req.user.id);
    if (user.walletBalance < amount)
      return res
        .status(400)
        .json({ success: false, message: "Insufficient wallet balance" });

    const transaction = await Transaction.create({
      user: user._id,
      type: "airtime",
      amount,
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
          Amount: amount,
          MobileNumber: phoneNumber,
          RequestID: `AyaxAir_${Date.now()}`,
        },
      },
    );

    if (
      response.data.status === "ORDER_RECEIVED" ||
      response.data.status === "SUCCESS"
    ) {
      user.walletBalance -= amount;
      await user.save();
      transaction.status = "success";
      transaction.reference = response.data.order_id || "CK_AIR_SUCCESS";
      await transaction.save();
      return res
        .status(200)
        .json({ success: true, message: "Airtime purchase successful" });
    } else {
      transaction.status = "failed";
      await transaction.save();
      return res
        .status(400)
        .json({ success: false, message: "Airtime provider error" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: "Airtime error" });
  }
};

/**
 * @desc    Verify Electricity Meter Number
 */
exports.verifyMeter = async (req, res) => {
  const { disco, meterNumber, meterType } = req.body;
  try {
    const url = `https://www.nellobytesystems.com/APIVerifyElectricityV1.asp?UserID=${process.env.CLUBKONNECT_USERID}&APIKey=${process.env.CLUBKONNECT_APIKEY}&ElectricCompany=${disco}&MeterNo=${meterNumber}&MeterType=${meterType}`;
    const response = await axios.get(url);
    if (response.data.name) {
      return res.status(200).json({ success: true, name: response.data.name });
    }
    return res
      .status(400)
      .json({ success: false, message: "Invalid Meter Number" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Meter verification failed" });
  }
};

/**
 * @desc    Purchase Electricity Token
 */
exports.purchaseElectricity = async (req, res) => {
  const { disco, meterNumber, amount, meterType } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (user.walletBalance < amount)
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance" });

    const response = await axios.get(
      `${process.env.CLUBKONNECT_BASE_URL}/Electricity.asp`,
      {
        params: {
          UserID: process.env.CLUBKONNECT_USERID,
          APIKey: process.env.CLUBKONNECT_APIKEY,
          ElectricCompany: disco,
          MeterNo: meterNumber,
          MeterType: meterType,
          Amount: amount,
          RequestID: `AyaxElec_${Date.now()}`,
        },
      },
    );

    if (
      response.data.status === "ORDER_RECEIVED" ||
      response.data.status === "SUCCESS"
    ) {
      user.walletBalance -= amount;
      await user.save();
      await Transaction.create({
        user: user._id,
        type: "utility",
        amount,
        phoneNumber: meterNumber,
        status: "success",
        reference: response.data.token || response.data.order_id,
      });
      return res.status(200).json({
        success: true,
        token: response.data.token,
        message: "Electricity purchase successful",
      });
    }
    return res.status(400).json({ success: false, message: "Payment failed" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Electricity error" });
  }
};

/**
 * @desc    Verify Cable TV
 */
exports.verifySmartCard = async (req, res) => {
  try {
    const { cable, smartCard } = req.body;
    const response = await axios.get(
      `${process.env.CLUBKONNECT_BASE_URL}/VerifySmartCardNo.asp`,
      {
        params: {
          UserID: process.env.CLUBKONNECT_USERID,
          APIKey: process.env.CLUBKONNECT_APIKEY,
          CableTV: cable,
          SmartCardNo: smartCard,
        },
      },
    );
    if (response.data.status === "SUCCESS") {
      return res.status(200).json({
        success: true,
        name: response.data.customer_name,
        currentPlan: response.data.current_plan,
      });
    }
    return res
      .status(400)
      .json({ success: false, message: "Invalid SmartCard" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Service failed" });
  }
};

/**
 * @desc    Purchase Cable TV (Added to match your routes)
 */
exports.purchaseCable = async (req, res) => {
  return res
    .status(400)
    .json({ success: false, message: "Cable purchase service coming soon" });
};

/**
 * @desc    NIMC Identity Validation (Renamed to match nimcValidation in routes)
 */
exports.nimcValidation = async (req, res) => {
  try {
    const { nin } = req.body;
    const user = await User.findById(req.user.id);
    if (user.walletBalance < 1000)
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance" });

    const response = await axios.post(process.env.NIMC_API_ENDPOINT, {
      api_key: process.env.NIMC_API_KEY,
      nin,
    });
    if (response.data.status === "success") {
      user.walletBalance -= 1000;
      await user.save();
      return res
        .status(200)
        .json({ success: true, data: response.data.slip_details });
    }
    return res.status(400).json({ success: false, message: "NIMC Failed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "NIMC error" });
  }
};

/**
 * @desc    Get History
 */
exports.getTransactionHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    return res
      .status(200)
      .json({ success: true, count: transactions.length, data: transactions });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Could not fetch history" });
  }
};
