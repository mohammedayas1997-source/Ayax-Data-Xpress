const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: { type: String },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Activity", ActivitySchema);
