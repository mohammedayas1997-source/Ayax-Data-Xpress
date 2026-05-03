const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions");
const admin = require("firebase-admin");
const app = require("./server"); // Wannan yana kiran server.js dinka dake cikin functions folder

// Initialize Firebase Admin
admin.initializeApp();

// Saita Options don rage kudi da gudun aiki
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1", // Ko wace region kake so
});

// Wannan shi ne zai maye gurbin app.listen() na dā
exports.api = onRequest(app);
