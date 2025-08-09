const express = require("express");
const mongoose = require("mongoose");
const twilio = require("twilio");
const bodyParser = require("body-parser");
require('dotenv').config(); // Load environment variables

// Twilio credentials from environment variables
const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);
const app = express();
app.use(bodyParser.json());

// Serve static files from the "public" directory
app.use(express.static('public'));

// MongoDB setup
const mongoUri = process.env.MONGO_URI;
mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.log('MongoDB connection error:', err));

// OTP Schema
const otpSchema = new mongoose.Schema({
    patientId: String,
    otp: String,
    createdAt: { type: Date, default: Date.now, index: { expires: 300 } } // expires in 5 mins
});

const OTP = mongoose.model("OTP", otpSchema);

// Constant Patient ID and Mobile
app.post("/send-otp", async (req, res) => {
    const { patientId, phoneNumber } = req.body;
  
    const phoneMapping = {
        DOC12345: "+919353173113",
        PAH12345: "+919353006355",
        PAH12346: "+917483132320",
        PAH12347: "+919035000678"
    };
  
    const mappedPhoneNumber = phoneMapping[patientId];
    if (!mappedPhoneNumber) {
        return res.json({ success: false, message: "Invalid Register ID." });
    }

    // Check if the entered phone number matches the mapped phone number
    const normalize = (number) => number.replace(/\D/g, ""); // Remove all non-digit characters
    const normalizedInput = normalize(phoneNumber);
    const normalizedMapped = normalize(mappedPhoneNumber);

    // Check if the normalized phone number matches
    if (normalizedInput !== normalizedMapped) {
        return res.json({ success: false, message: "Phone number does not match the registered number for this ID." });
    }
  
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
    try {
        await OTP.create({ patientId, otp });
  
        const message = await client.messages.create({
            body: `Your H+ OTP code is ${otp} and do not share it with others.`,
            from: twilioPhoneNumber,
            to: phoneNumber
        });
  
        console.log(`OTP sent to ${phoneNumber}: ${message.sid}`);
        res.json({ success: true, message: "OTP sent successfully!" });
    } catch (error) {
        console.error("Error sending OTP:", error.message);
        res.json({ success: false, message: "Failed to send OTP. Try again." });
    }
  });
  
  app.post("/verify-otp", async (req, res) => {
    const { patientId, otp } = req.body;
  
    try {
        // Find OTP record matching the patient ID and OTP
        const record = await OTP.findOne({ patientId, otp });
        if (record) {
            res.json({ success: true, message: "OTP verified successfully!" });
        } else {
            res.json({ success: false, message: "Invalid OTP or OTP expired." });
        }
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "An error occurred during verification." });
    }
  });

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));