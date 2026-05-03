const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    surname: { type: String, required: [true, "Surname is required"] },
    firstName: { type: String, required: [true, "First name is required"] },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true, // Don gudun kuskure wurin login
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
      select: false, // Wannan zai kare password kar ya fito a queries
    },
    walletBalance: {
      type: Number,
      default: 0.0,
      min: [0, "Wallet balance cannot be negative"], // Rigakafi don kar balance ya zama minus
    },
    pin: {
      type: String,
      minlength: 4,
      maxlength: 4,
      default: "0000",
      select: false, // Kare PIN don tsaro
    },

    // PAYSTACK DEDICATED ACCOUNTS
    paystackCustomerCode: { type: String },
    bankName: { type: String },
    accountNumber: { type: String },
    accountName: { type: String },

    // ROLE MANAGEMENT
    role: {
      type: String,
      enum: ["user", "agent", "supervisor", "leader", "admin", "support"],
      default: "user",
    },

    // RELATIONSHIPS
    assignedSupervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedLeader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // TARGETS LOGIC
    targets: {
      agentGoal: { type: Number, default: 0 },
      dataGoal: { type: Number, default: 0 },
      supervisorGoal: { type: Number, default: 0 },
      currentMonth: { type: String },
    },

    isSuspended: { type: Boolean, default: false },
    address: { type: String },
  },
  {
    timestamps: true, // Wannan zai baka createdAt da updatedAt kai tsaye
  },
);

// Password Encryption
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Hash PIN before saving (For Security)
UserSchema.pre("save", async function (next) {
  if (!this.isModified("pin")) return next();
  const salt = await bcrypt.genSalt(10);
  this.pin = await bcrypt.hash(this.pin, salt);
});

// Method don duba password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method don duba PIN (Transactions)
UserSchema.methods.matchPin = async function (enteredPin) {
  return await bcrypt.compare(enteredPin, this.pin);
};

module.exports = mongoose.model("User", UserSchema);
