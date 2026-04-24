const mongoose = require("mongoose");

const TargetHistorySchema = new mongoose.Schema({
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  dataGoal: { type: Number, required: true },
  agentGoal: { type: Number, required: true },
  achievedData: { type: Number, default: 0 },
  achievedAgents: { type: Number, default: 0 },
  month: { type: String, required: true }, // Misali: "May 2026"
  status: {
    type: String,
    enum: ["Active", "Completed", "Failed"],
    default: "Active",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TargetHistory", TargetHistorySchema);
