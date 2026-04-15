const User = require("../models/User");
const Transaction = require("../models/Transaction");
const axios = require("axios");

// --- 1. DATA PURCHASE (ClubKonnect) ---
exports.buyData = async (req, res) => {
  try {
    const { network, planId, phoneNumber, amount } = req.body;
    const user = await User.findById(req.user.id);

    if (user.walletBalance < amount) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient funds" });
    }

    const transaction = await Transaction.create({
      user: user._id,
      type: "data",
      amount,
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

    // ClubKonnect returns 'status' as a string in the response
    if (
      response.data.status === "ORDER_RECEIVED" ||
      response.data.status === "SUCCESS"
    ) {
      user.walletBalance -= amount;
      await user.save();

      transaction.status = "success";
      transaction.reference = response.data.order_id || "CK_SUCCESS";
      await transaction.save();

      res
        .status(200)
        .json({ success: true, message: "Data purchase successful" });
    } else {
      transaction.status = "failed";
      await transaction.save();
      res.status(400).json({
        success: false,
        message: response.data.remarks || "Provider error",
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Transaction failed" });
  }
};

// --- 2. ELECTRICITY (NEPA - ClubKonnect) ---
exports.buyElectricity = async (req, res) => {
  try {
    const { disco, meterNumber, meterType, amount } = req.body;
    const user = await User.findById(req.user.id);

    if (user.walletBalance < amount) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient funds" });
    }

    const transaction = await Transaction.create({
      user: user._id,
      type: "utility",
      amount,
      phoneNumber: meterNumber,
      status: "pending",
    });

    const response = await axios.get(
      `${process.env.CLUBKONNECT_BASE_URL}/Electricity.asp`,
      {
        params: {
          UserID: process.env.CLUBKONNECT_USERID,
          APIKey: process.env.CLUBKONNECT_APIKEY,
          ElectricCompany: disco,
          MeterNo: meterNumber,
          MeterType: meterType, // 01 for Prepaid, 02 for Postpaid
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

      transaction.status = "success";
      transaction.reference = response.data.token || response.data.order_id;
      await transaction.save();

      res.status(200).json({
        success: true,
        token: response.data.token,
        message: "Electricity purchase successful",
      });
    } else {
      transaction.status = "failed";
      await transaction.save();
      res.status(400).json({
        success: false,
        message: response.data.remarks || "Provider error",
      });
    }
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Electricity purchase failed" });
  }
};

// --- 3. CABLE TV (ClubKonnect) ---
exports.buyCable = async (req, res) => {
  try {
    const { cable, smartCard, plan, amount } = req.body;
    const user = await User.findById(req.user.id);

    if (user.walletBalance < amount) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient funds" });
    }

    const transaction = await Transaction.create({
      user: user._id,
      type: "cable",
      amount,
      phoneNumber: smartCard,
      status: "pending",
    });

    const response = await axios.get(
      `${process.env.CLUBKONNECT_BASE_URL}/CableTV.asp`,
      {
        params: {
          UserID: process.env.CLUBKONNECT_USERID,
          APIKey: process.env.CLUBKONNECT_APIKEY,
          CableTV: cable,
          SmartCardNo: smartCard,
          Package: plan,
          RequestID: `AyaxCable_${Date.now()}`,
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
      await transaction.save();

      res
        .status(200)
        .json({ success: true, message: "Cable subscription successful" });
    } else {
      transaction.status = "failed";
      await transaction.save();
      res.status(400).json({
        success: false,
        message: response.data.remarks || "Provider error",
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Cable purchase failed" });
  }
};

// --- 4. NIMC VALIDATION ---
exports.validateNIMC = async (req, res) => {
  try {
    const { nin } = req.body;
    const cost = 1000;
    const user = await User.findById(req.user.id);

    if (user.walletBalance < cost) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance" });
    }

    // NIMC usually requires a POST request to your specific identity provider
    const response = await axios.post(process.env.NIMC_API_ENDPOINT, {
      api_key: process.env.NIMC_API_KEY,
      nin: nin,
    });

    if (response.data.status === "success") {
      user.walletBalance -= cost;
      await user.save();

      await Transaction.create({
        user: user._id,
        type: "nimc",
        amount: cost,
        phoneNumber: nin,
        status: "success",
      });

      res.status(200).json({
        success: true,
        data: response.data.slip_details || response.data.user_info,
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "NIMC Validation failed" });
  }
};

// @desc    Get user transaction history
// @route   GET /api/v1/vtu/history
// @access  Private
exports.getTransactionHistory = async (req, res) => {
  try {
    // Nemo dukkan transactions na wannan user din, a jero su daga na kwanan nan (latest)
    const transactions = await Transaction.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// --- 5. VERIFY METER NUMBER (NEPA Lookup) ---
exports.verifyMeter = async (req, res) => {
  try {
    const { disco, meterNumber, meterType } = req.body;

    const response = await axios.get(
      `${process.env.CLUBKONNECT_BASE_URL}/VerifyMeterNo.asp`,
      {
        params: {
          UserID: process.env.CLUBKONNECT_USERID,
          APIKey: process.env.CLUBKONNECT_APIKEY,
          ElectricCompany: disco,
          MeterNo: meterNumber,
          MeterType: meterType,
        },
      },
    );

    if (response.data.status === "SUCCESS") {
      res.status(200).json({
        success: true,
        name: response.data.customer_name,
        address: response.data.address,
      });
    } else {
      res.status(400).json({ success: false, message: "Invalid Meter Number" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Meter verification failed" });
  }
};

// --- 6. VERIFY SMARTCARD (Cable TV Lookup) ---
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
      res.status(200).json({
        success: true,
        name: response.data.customer_name,
        currentPlan: response.data.current_plan,
      });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Invalid SmartCard Number" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "SmartCard verification failed" });
  }
};
