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
  paystackCustomerCode: { type: String }, // Code din user a Paystack
  bankName: { type: String, default: "WEMA BANK" },
  accountNumber: { type: String },
  accountName: { type: String },
  // ---------------------------------
  role: {
    type: String,
    enum: ["user", "agent", "admin"],
    default: "user",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Password Encryption
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next(); // Gyara: return next don kar ya ci gaba
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method don duba idan password yayi daidai
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
