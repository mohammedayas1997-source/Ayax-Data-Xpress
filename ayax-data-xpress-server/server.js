const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors"); // 1. Ka ƙara wannan
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const walletRoutes = require("./routes/walletRoutes");
const vtuRoutes = require("./routes/vtuRoutes");
const webhookRoutes = require("./routes/webhookRoutes");

dotenv.config();

connectDB();

const app = express();

// 2. Yi amfani da CORS a nan kafin sauran routes
app.use(cors());

app.use(express.json());

// Routes dinka
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/webhooks", webhookRoutes);
app.use("/api/v1/wallet", walletRoutes);
app.use("/api/v1/vtu", vtuRoutes);

app.get("/", (req, res) => {
  res.send("Ayax Data Xpress API is Running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
