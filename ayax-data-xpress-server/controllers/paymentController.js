const User = require("../models/User");
const Transaction = require("../models/Transaction");
const crypto = require("crypto");

exports.paystackWebhook = async (req, res) => {
  // 1. Tabbatar saƙon daga Paystack yake (Security Check)
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    return res.sendStatus(400);
  }

  const event = req.body;

  // 2. Duba idan tura kuɗi ne ya faru (charge.success)
  if (event.event === "charge.success") {
    const { amount, customer, reference } = event.data;
    const userEmail = customer.email;

    // Adadin kuɗin (Paystack na turo shi a Kobo, don haka za mu raba da 100)
    const actualAmount = amount / 100;

    // 3. Nemo User kuma sabunta Wallet
    const user = await User.findOne({ email: userEmail });
    if (user) {
      user.walletBalance += actualAmount;
      await user.save();

      // 4. Ajiye Transaction
      await Transaction.create({
        user: user._id,
        type: "wallet_funding",
        amount: actualAmount,
        status: "success",
        reference: reference,
      });
    }
  }

  res.sendStatus(200); // Sanar da Paystack cewa saƙo ya isa
};
