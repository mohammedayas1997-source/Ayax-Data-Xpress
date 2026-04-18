const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios"); // Kar ka manta da wannan don Paystack

// --- Helper: Generate and Send JWT Token ---
const sendToken = (user, statusCode, res) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      balance: user.walletBalance,
      role: user.role, // Na kara wannan don Frontend ya san matsayin user
    },
  });
};

// @desc    Register a new user (With Agent Support)
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role, state, lga, address } =
      req.body;

    // 1. Create user in the database
    // Muna tura role, state, lga, da address kai tsaye daga SignupScreen
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: role || "user",
      state: role === "agent" ? state : undefined,
      lga: role === "agent" ? lga : undefined,
      address: role === "agent" ? address : undefined,
    });

    // 2. Create Paystack Dedicated Account (Background Task)
    // Tunda baka kira shi a code dinka na baya ba, na bar shi a matsayin background task
    createDedicatedAccount(user);

    sendToken(user, 201, res);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email and password",
      });
    }

    // 2. Check for user in database
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // 3. Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    sendToken(user, 200, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// --- Paystack Dedicated Account Logic ---
const createDedicatedAccount = async (user) => {
  try {
    // A. Create customer on Paystack first
    const customer = await axios.post(
      "https://api.paystack.co/customer",
      {
        email: user.email,
        first_name: user.name.split(" ")[0] || "User", // Gyara: amfani da name tunda baka da firstName a req.body
        last_name: user.name.split(" ")[1] || "Ayax",
        phone: user.phone,
      },
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      },
    );

    // B. Request Dedicated Account
    const account = await axios.post(
      "https://api.paystack.co/dedicated_account",
      {
        customer: customer.data.data.customer_code,
        preferred_bank: "wema-bank",
      },
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      },
    );

    // C. Save Account Details to User Model
    await User.findByIdAndUpdate(user._id, {
      paystackCustomerCode: customer.data.data.customer_code,
      bankName: account.data.data.bank.name,
      accountNumber: account.data.data.account_number,
      accountName: account.data.data.account_name,
    });
  } catch (error) {
    console.log(
      "Paystack Account Error:",
      error.response?.data?.message || error.message,
    );
  }
};
