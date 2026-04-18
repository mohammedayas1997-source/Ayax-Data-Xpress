const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please provide a valid email address",
    ],
  },
  phone: {
    type: String,
    required: [true, "Phone number is required"],
    unique: true,
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: 6,
    select: false,
  },
  walletBalance: {
    type: Number,
    default: 0.0,
  },
  pin: {
    type: String,
    minlength: 4,
    maxlength: 4,
    default: "0000",
  },

  // --- SABBIN FIELDS NA PAYSTACK ---
  paystackCustomerCode: { type: String },
  bankName: { type: String, default: "WEMA BANK" },
  accountNumber: { type: String },
  accountName: { type: String },

  // --- AGENT & SUPERVISOR MANAGEMENT ---
  role: {
    type: String,
    enum: ["user", "agent", "supervisor", "admin"], // Na kara 'supervisor'
    default: "user",
  },
  // Wannan field din zai nuna wane supervisor ne ke kula da wannan Agent din
  assignedSupervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  // Targets (Domin Supervisors da Agents su ga abin da ake bukata daga gare su)
  targets: {
    agentGoal: { type: Number, default: 0 }, // Target din register agents
    dataGoal: { type: Number, default: 0 }, // Target din GB (misali 100GB)
    currentMonth: { type: String }, // Misali: "April 2026"
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Password Encryption
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method don duba idan password yayi daidai
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
