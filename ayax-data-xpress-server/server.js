const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

// Import Routes
const authRoutes = require("./routes/authRoutes");
const walletRoutes = require("./routes/walletRoutes");
const vtuRoutes = require("./routes/vtuRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const support = require("./routes/supportRoutes");
const agentRoutes = require("./routes/agentRoutes");
const leaderRoutes = require("./routes/leaderRoutes");

// Load Environment Variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// 1. CORS Configuration
app.use(cors());

// 2. Body Parser (Payload limits)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// 3. Application Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/webhooks", webhookRoutes);
app.use("/api/v1/wallet", walletRoutes);
app.use("/api/v1/vtu", vtuRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/support", support);
app.use("/api/v1/agent", agentRoutes); // Na kara wannan tunda baka saka shi ba
app.use("/api/v1/leader", leaderRoutes);

// Base Route
app.get("/", (req, res) => {
  res.send("Ayax Data Xpress API is Running...");
});

// 4. Global Error Handler (Domin kare Server daga crash)
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

const allowedOrigins = [
  "https://www.ayaxdata.online",
  "https://ayaxdata.online",
  "https://ayax-data-xpress-server.vercel.app", // Domain din backend dinka na Vercel
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// ... sauran koda
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app; // WANNAN SHINE MAFI MUHIMMANCI
