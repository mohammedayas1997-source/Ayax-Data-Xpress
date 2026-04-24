const express = require("express");
const router = express.Router();

// Shigo da dukkan ayyukan (functions) daga controller
// Mun kara forgotPassword da resetPassword a jerin
const {
  register,
  login,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

// Route for user registration
// URL: /api/v1/auth/register
router.post("/register", register);

// Route for user login
// URL: /api/v1/auth/login
router.post("/login", login);

// Routes for password recovery
// URL: /api/v1/auth/forgot-password
router.post("/forgot-password", forgotPassword);

// URL: /api/v1/auth/reset-password
router.post("/reset-password", resetPassword);

module.exports = router;
