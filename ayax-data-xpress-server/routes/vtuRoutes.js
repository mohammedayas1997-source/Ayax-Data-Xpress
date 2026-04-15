const express = require("express");
const router = express.Router();
const { buyData } = require("../controllers/vtuController");
const { protect } = require("../middleware/authMiddleware");

router.post("/buy-data", protect, buyData);
router.post("/electricity", protect, purchaseElectricity);
router.post("/cable", protect, purchaseCable);
// Route for NIMC Validation and Printing
router.post("/nimc-validate", protect, nimcValidation);
router.post("/verify-meter", protect, verifyMeter);
router.post("/verify-smartcard", protect, verifySmartCard);
module.exports = router;
