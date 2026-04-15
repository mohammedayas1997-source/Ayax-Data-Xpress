const express = require("express");
const router = express.Router();
const {
  buyData,
  buyAirtime, // Kar ka manta da airtime
  purchaseElectricity,
  purchaseCable,
  nimcValidation,
  verifyMeter,
  verifySmartCard,
} = require("../controllers/vtuController");
const { protect } = require("../middleware/authMiddleware");

// Duk waɗannan routes ɗin suna buƙatar mutum ya yi login (protect)
router.post("/buy-data", protect, buyData);
router.post("/buy-airtime", protect, buyAirtime); // Na ƙara wannan
router.post("/electricity", protect, purchaseElectricity);
router.post("/cable", protect, purchaseCable);

// NIMC & Verification
router.post("/nimc-validate", protect, nimcValidation);
router.post("/verify-meter", protect, verifyMeter);
router.post("/verify-smartcard", protect, verifySmartCard);

module.exports = router;
