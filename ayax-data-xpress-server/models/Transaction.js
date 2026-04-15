const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["data", "airtime", "electricity", "cable"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  phoneNumber: String,
  status: {
    type: String,
    enum: ["pending", "success", "failed"],
    default: "pending",
  },
  reference: String, // ID from the VTU provider
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Transaction", TransactionSchema);
