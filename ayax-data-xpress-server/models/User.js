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

  // --- AGENT, SUPERVISOR & LEADER MANAGEMENT ---
  role: {
    type: String,
    // Mun ƙara 'leader' a nan
    enum: ["user", "agent", "supervisor", "leader", "admin"],
    default: "user",
  },

  // Idan Agent ne, wannan zai riƙe ID na Supervisor ɗinsa
  assignedSupervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  // Idan Supervisor ne, wannan zai riƙe ID na Leader ɗinsa
  assignedLeader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  // Targets (Domin Leaders, Supervisors da Agents)
  targets: {
    agentGoal: { type: Number, default: 0 }, // Target na register sabbin mutane
    dataGoal: { type: Number, default: 0 }, // Target na yawan GB da za a sayar
    supervisorGoal: { type: Number, default: 0 }, // Target na Leader zuwa ga Supervisor
    currentMonth: { type: String }, // Misali: "April 2026"
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  isSuspended: {
    type: Boolean,
    default: false,
  },
  address: {
    type: String,
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
