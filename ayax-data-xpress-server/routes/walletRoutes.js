const express = require("express");
const router = express.Router();
const {
  getBalance,
  initializePayment,
  verifyPayment,
  fundWalletManual, // Wannan shi ne tsohon 'fundWallet' dinka don testing
} = require("../controllers/walletController");
const { protect } = require("../middleware/authMiddleware");

// Dukkan wadannan hanyoyin (routes) suna bukatar mutum ya yi login (Protected)

// 1. Duba kudin da ke cikin wallet
router.get("/balance", protect, getBalance);

// 2. Fara biyan kudi ta Paystack (Zai ba ka Payment Link)
router.post("/initialize", protect, initializePayment);

// 3. Tabbatar da biyan kudi bayan mutum ya gama (Verify transaction)
router.get("/verify/:reference", protect, verifyPayment);

// 4. Saka kudi na gwaji (Don 'Development' kawai, zaka iya goge shi idan ka gama)
router.post("/fund-manual", protect, fundWalletManual);

module.exports = router;
