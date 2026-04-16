const axios = require("axios");
const User = require("../models/User");

// 1. Verify Meter Number
exports.verifyMeter = async (req, res) => {
  const { electricCompany, meterNo, meterType } = req.body;

  try {
    const url = `https://www.nellobytesystems.com/APIVerifyElectricityV1.asp?UserID=${process.env.CLUBKONNECT_USERID}&APIKey=${process.env.CLUBKONNECT_APIKEY}&ElectricCompany=${electricCompany}&MeterNo=${meterNo}&MeterType=${meterType}`;

    const response = await axios.get(url);

    if (response.data.name) {
      res.status(200).json({ success: true, customerName: response.data.name });
    } else {
      res.status(400).json({ success: false, message: "Invalid Meter Number" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Verification Failed" });
  }
};

// 2. Process Electricity Payment
exports.buyElectricity = async (req, res) => {
  const { electricCompany, meterNo, meterType, amount, phoneNo } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (user.walletBalance < amount) {
      return res.status(400).json({ message: "Insufficient Wallet Balance" });
    }

    const requestId = `ELEC${Date.now()}`;
    const url = `https://www.nellobytesystems.com/APIElectricityV1.asp?UserID=${process.env.CLUBKONNECT_USERID}&APIKey=${process.env.CLUBKONNECT_APIKEY}&ElectricCompany=${electricCompany}&MeterType=${meterType}&MeterNo=${meterNo}&Amount=${amount}&PhoneNo=${phoneNo}&RequestID=${requestId}`;

    const response = await axios.get(url);

    if (response.data.status === "ORDER_RECEIVED") {
      user.walletBalance -= amount;
      await user.save();

      res.status(200).json({
        success: true,
        message: "Payment Successful",
        orderId: response.data.orderid,
      });
    } else {
      res.status(400).json({ success: false, message: "Transaction Failed" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Payment processing error" });
  }
};
