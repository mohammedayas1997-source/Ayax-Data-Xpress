const express = require("express");
const router = express.Router();

// Shigo da dukkan ayyukan (functions) daga controller
const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  updatePin,
  updatePassword,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

// --- PUBLIC ROUTES (Kowa zai iya shiga) ---

// URL: /api/v1/auth/register
router.post("/register", register);

// URL: /api/v1/auth/login
router.post("/login", login);

// Password Recovery
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// --- PRIVATE ROUTES (Sai wanda ya yi login) ---

// URL: /api/v1/auth/me (Don loda profile da balance)
router.get("/me", protect, getMe);

// URL: /api/v1/auth/update-password
router.put("/update-password", protect, updatePassword);

// URL: /api/v1/auth/update-pin (Domin canza transaction PIN)
router.put("/update-pin", protect, updatePin);

module.exports = router;
