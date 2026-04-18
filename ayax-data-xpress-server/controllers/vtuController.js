const User = require("../models/User");
const Transaction = require("../models/Transaction");
const axios = require("axios");
const DataPlan = require("../models/DataPlan");
const Sale = require("../models/Sale"); // Mun kara wannan

/**
 * @desc    Purchase Mobile Data with Agent Target Tracking
 * @route   POST /api/v1/vtu/buy-data
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

      // --- TARGET TRACKING LOGIC ---
      // Idan Agent ne kuma yana da Supervisor, a yi rajistar tallan a Sales model
      if (user.role === "agent" && user.assignedSupervisor) {
        await Sale.create({
          agentId: user._id,
          supervisorId: user.assignedSupervisor,
          dataAmountGB: plan.sizeGB || 0, // Tabbatar plan dinka yana da sizeGB field
          planName: plan.planLabel,
        });
      }
      // ------------------------------

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
    console.error("DATA_PURCHASE_ERROR:", error.message);
    return res.status(500).json({
      success: false,
      message: "An internal error occurred. Please try again later.",
    });
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
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Meter Number" });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Meter verification service unavailable",
    });
  }
};

/**
 * @desc    Purchase Electricity Token
 */
exports.purchaseElectricity = async (req, res) => {
  const { disco, meterNumber, amount, meterType } = req.body;
  try {
    const user = await User.findById(req.user.id);

    if (user.walletBalance < amount) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance" });
    }

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
    } else {
      return res.status(400).json({
        success: false,
        message: response.data.remarks || "Payment failed",
      });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Electricity processing error" });
  }
};

/**
 * @desc    Verify Cable TV SmartCard/IUC Number
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
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid SmartCard Number" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Verification service failed" });
  }
};

/**
 * @desc    NIMC Identity Validation
 */
exports.validateNIMC = async (req, res) => {
  try {
    const { nin } = req.body;
    const validationCost = 1000;
    const user = await User.findById(req.user.id);

    if (user.walletBalance < validationCost) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance for validation",
      });
    }

    const response = await axios.post(process.env.NIMC_API_ENDPOINT, {
      api_key: process.env.NIMC_API_KEY,
      nin: nin,
    });

    if (response.data.status === "success") {
      user.walletBalance -= validationCost;
      await user.save();

      await Transaction.create({
        user: user._id,
        type: "nimc",
        amount: validationCost,
        phoneNumber: nin,
        status: "success",
      });

      return res.status(200).json({
        success: true,
        data: response.data.slip_details || response.data.user_info,
      });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "NIMC validation failed" });
  }
};

/**
 * @desc    Get User Transaction History
 */
exports.getTransactionHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Could not fetch history" });
  }
};

/**
 * @desc    Purchase Mobile Airtime (ClubKonnect)
 * @route   POST /api/v1/vtu/buy-airtime
 */
exports.buyAirtime = async (req, res) => {
  try {
    const { network, phoneNumber, amount } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (user.walletBalance < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
    }

    const transaction = await Transaction.create({
      user: userId,
      type: "airtime",
      amount: amount,
      phoneNumber: phoneNumber,
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

      return res.status(200).json({
        success: true,
        message: "Airtime purchase successful",
        orderId: response.data.order_id,
      });
    } else {
      transaction.status = "failed";
      await transaction.save();

      return res.status(400).json({
        success: false,
        message:
          response.data.remarks || "Airtime provider rejected the request",
      });
    }
  } catch (error) {
    console.error("AIRTIME_ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "An internal error occurred during airtime purchase",
    });
  }
};
