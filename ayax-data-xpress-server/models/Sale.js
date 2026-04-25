const mongoose = require("mongoose");
const saleSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amount: Number,
    status: String,
  },
  { timestamps: true },
);
module.exports = mongoose.model("Sale", saleSchema);
