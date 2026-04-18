const DataPlan = require("../models/DataPlan");

// Create or Update a Plan
exports.setPlanPrice = async (req, res) => {
  const {
    networkId,
    planCode,
    userPrice,
    agentPrice,
    planLabel,
    networkName,
    sizeGB, // Muna bukatar wannan domin Target Tracking (misali: 1, 0.5, 2)
    planType, // SME, Corporate, Gifting
    validity, // 30 Days, 7 Days
  } = req.body;

  try {
    const plan = await DataPlan.findOneAndUpdate(
      { networkId, planCode },
      {
        userPrice,
        agentPrice,
        planLabel,
        networkName,
        sizeGB,
        planType,
        validity,
        isActive: true,
      },
      { upsert: true, new: true },
    );
    res.status(200).json({ success: true, plan });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error updating plan details" });
  }
};

// Get all plans for the App
exports.getPlans = async (req, res) => {
  try {
    // Zamu iya hada su ta hanyar Network domin sauki a Frontend
    const plans = await DataPlan.find({ isActive: true }).sort({
      networkName: 1,
    });
    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching plans" });
  }
};
