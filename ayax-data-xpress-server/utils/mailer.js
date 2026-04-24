const nodemailer = require("nodemailer");

/**
 * Professional Mailer Configuration
 * Using Ayax Data Solutions business email
 */

const transporter = nodemailer.createTransport({
  host: "mail.ayaxdata.online", // Ko 'smtppro.zoho.com' ko na host dinka
  port: 465, // Port 465 na SSL ne (wanda aka fi sani da Secure)
  secure: true, // true domin muna amfani da SSL
  auth: {
    user: "support@ayaxdata.online", // Business Email dinka
    pass: "Ayas1997@", // Password din email din
  },
});

/**
 * sendMail Function
 */
const sendMail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: '"Ayax Data Xpress" <support@ayaxdata.online>',
      to: to,
      subject: subject,
      html: html,
    });

    console.log("Email sent successfully: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email Sending Failed:", error);
    return { success: false, error: error.message };
  }
};

module.exports = sendMail;
