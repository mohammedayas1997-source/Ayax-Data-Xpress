const crypto = require("crypto");
const User = require("../models/User");
const Transaction = require("../models/Transaction");

exports.handlePaystackWebhook = async (req, res) => {
  try {
    // 1. Tabbatar da cewa daga Paystack sakon yake (Validation)
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(400).send("Invalid Signature");
    }

    const event = req.body;

    // 2. Duba idan har an samu nasarar biya
    if (event.event === "charge.success") {
      const { amount, reference, metadata } = event.data;
      const userId = metadata.userId;
      const amountInNaira = amount / 100;

      // 3. Duba idan ba mu riga mun saka kudin ba (To avoid double funding)
      const existingTx = await Transaction.findOne({ reference: reference });

      if (!existingTx) {
        const user = await User.findById(userId);
        if (user) {
          user.walletBalance += amountInNaira;
          await user.save();

          await Transaction.create({
            user: userId,
            type: "deposit",
            amount: amountInNaira,
            status: "success",
            reference: reference,
          });
          console.log(`Wallet funded via Webhook for user: ${userId}`);
        }
      }
    }

    // 4. Sanar da Paystack cewa mun karbi sakon (Dole ne ka dawo musu da 200 OK)
    res.status(200).send("Webhook Received");
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).send("Internal Server Error");
  }
};
