const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const sendMail = require("../utils/mailer"); // Imported your mailer logic

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
      role: user.role,
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

    // --- NEW: Trigger Welcome Email ---
    const welcomeHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px;">
        <h2 style="color: #1e3a8a; text-align: center;">Welcome to Ayax Data Xpress!</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Thank you for choosing <strong>Ayax Data Xpress</strong>. Your account has been created successfully.</p>
        <p>You can now log in to your app to buy data, airtime, and pay utility bills at the best rates.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #64748b; text-align: center;">
          If you didn't sign up for this account, please contact us at support@ayaxdata.online
        </p>
      </div>
    `;

    // We don't use 'await' here so that the user gets the response immediately
    // without waiting for the email server to finish.
    sendMail(email, "Welcome to Ayax Data Xpress", welcomeHTML);

    // 2. Create Paystack Dedicated Account (Background Task)
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
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email and password",
      });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

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

// @desc    Forgot Password - Send OTP
// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Duba ko user yana nan
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found with that email",
      });
    }

    // 2. Samar da OTP (6 Digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Ajiye OTP a Database (Saka shi ya mutu bayan minti 10)
    user.resetPasswordToken = otp;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // 4. Tsara HTML ɗin Email ɗin
    const otpHTML = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #1e3a8a;">Password Reset Code</h2>
        <p>Your verification code for <strong>Ayax Data Xpress</strong> is:</p>
        <h1 style="color: #1e3a8a; font-size: 40px; letter-spacing: 10px; margin: 20px 0;">${otp}</h1>
        <p style="color: #64748b;">This code is valid for only 10 minutes. Do not share it with anyone.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 11px; color: #94a3b8;">If you did not request this, please ignore this email.</p>
      </div>
    `;

    // 5. Tura Email ɗin
    const mailSent = await sendMail(email, "Your Password Reset OTP", otpHTML);

    if (mailSent.success) {
      res.status(200).json({
        success: true,
        message: "OTP sent to your email",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Email could not be sent",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Reset Password using OTP
// @route   POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // 1. Duba user mai wannan email ɗin da OTP ɗin da bai riga ya mutu ba
    const user = await User.findOne({
      email,
      resetPasswordToken: otp,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP or OTP has expired",
      });
    }

    // 2. Canja password ɗin (Bcrypt zai yi hashing ɗinsa a User Model)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful! You can now login.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// --- Paystack Dedicated Account Logic ---
const createDedicatedAccount = async (user) => {
  try {
    const customer = await axios.post(
      "https://api.paystack.co/customer",
      {
        email: user.email,
        first_name: user.name.split(" ")[0] || "User",
        last_name: user.name.split(" ")[1] || "Ayax",
        phone: user.phone,
      },
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      },
    );

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
