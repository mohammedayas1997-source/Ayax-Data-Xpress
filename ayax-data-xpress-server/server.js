const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

// 1. Load Environment Variables
dotenv.config();
// 2. Connect Database (With Error Handling for Vercel)
connectDB().catch((err) => {
  console.error("MongoDB Connection Failed:", err.message);
});
const app = express();

// 3. Optimized CORS Configuration
const allowedOrigins = [
  "https://www.ayaxdata.online",
  "https://ayaxdata.online",
  "https://ayax-data-xpress-server.vercel.app",
  "https://ayax-api-v2.vercel.app",
  "http://localhost:3000", // Don testing na Frontend a gida
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.some((domain) =>
        origin.startsWith(domain),
      );

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("CORS policy violation: Origin not allowed"), false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// 4. Body Parser (Important for Large Payloads)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// 5. Route Imports
// MUHIMMI: Tabbatar wadannan files din suna nan da sunayensu daidai
const authRoutes = require("./routes/authRoutes");
const walletRoutes = require("./routes/walletRoutes");
const vtuRoutes = require("./routes/vtuRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const supportRoutes = require("./routes/supportRoutes");
const agentRoutes = require("./routes/agentRoutes");
const leaderRoutes = require("./routes/leaderRoutes");
const supervisorRoutes = require("./routes/supervisorRoutes"); // Na kara wannan tunda mun gyara shi daxu

// 6. Application Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/webhooks", webhookRoutes);
app.use("/api/v1/wallet", walletRoutes);
app.use("/api/v1/vtu", vtuRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/support", supportRoutes);
app.use("/api/v1/agent", agentRoutes);
app.use("/api/v1/leader", leaderRoutes);
app.use("/api/v1/supervisors", supervisorRoutes);

// 7. Health Check / Root Route
app.get("/", (req, res) => {
  res.status(200).send(`
    <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
      <h1 style="color: #2c3e50;">Ayax Data Xpress API v2</h1>
      <p style="color: #7f8c8d; font-size: 18px;">Backend is live and running successfully.</p>
      <div style="margin-top: 20px; padding: 15px; background: #f4f4f4; border-radius: 8px; display: inline-block;">
        Server Status: <span style="color: #27ae60; font-weight: bold;">ONLINE</span>
      </div>
      <p style="margin-top: 20px; color: #bdc3c7;">Developed by Abdulrahman Mohammed</p>
    </div>
  `);
});

// 8. Handle 404 Routes
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API Route not found",
  });
});

// 9. Global Error Handler (Vercel Debugging)
app.use((err, req, res, next) => {
  console.error("[SERVER ERROR]:", err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    // Stack trace din zai taimaka maka ganin takamaiman inda matsalar take
    stack: process.env.NODE_ENV === "production" ? "🥞" : err.stack,
  });
});

// 10. Port & Listen
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server is running locally on port ${PORT}`);
  });
}

// 11. Export for Vercel (The most important part)
module.exports = app;
