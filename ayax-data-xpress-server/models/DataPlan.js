const mongoose = require("mongoose");

const dataPlanSchema = new mongoose.Schema(
  {
    networkName: { type: String, required: true }, // e.g., "MTN"
    networkId: { type: String, required: true }, // e.g., "01"
    planCode: { type: String, required: true }, // Nellobyte code (e.g., "11")
    planLabel: { type: String, required: true }, // e.g., "1.0GB SME"
    userPrice: { type: Number, required: true }, // Price for regular users
    agentPrice: { type: Number, required: true }, // Price for registered agents
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("DataPlan", dataPlanSchema);
