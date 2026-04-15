const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");

// Route for user registration
// URL: /api/v1/auth/register
router.post("/register", register);

// Route for user login
// URL: /api/v1/auth/login
router.post("/login", login);

module.exports = router;
