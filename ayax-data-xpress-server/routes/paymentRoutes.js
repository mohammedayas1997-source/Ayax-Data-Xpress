const express = require("express");
const router = express.Router();
const { paystackWebhook } = require("../controllers/paymentController");

// Wannan URL din zai zama: your-app.vercel.app/api/v1/payments/webhook
router.post("/webhook", paystackWebhook);

module.exports = router;
