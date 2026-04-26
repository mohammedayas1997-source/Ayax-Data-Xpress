const mongoose = require("mongoose");

const connectDB = async () => {
  // Idan har akwai connection, kar a sake bude wani
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Idan bai samu DB ba cikin sakan 5, ya dakata
      socketTimeoutMS: 45000, // Ya bar connection din a bude na tsawon lokaci
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    // A Vercel, zai fi kyau mu bar error handler na server.js ya kula da wannan
    throw error;
  }
};

module.exports = connectDB;
