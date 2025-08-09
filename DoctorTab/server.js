const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const twilio = require('twilio');


const accountSid = "AC6fce5b7924a4478a6e7621be6d9cd032";
const authToken = "4fbf8fca5928317058fd12f192673d94";
const twilioPhoneNumber = "+12406695824";

const client = twilio(accountSid, authToken); // Initialize Twilio client



// Create an Express app
const app = express();
const port = 5000;

// Enable CORS for the frontend (running on a different port)
app.use(cors());

// Middleware to parse incoming form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (e.g., index.html, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname,'index.html'));  // Explicitly serve index.html
  });

// MongoDB connection URL
const mongoURI = 'mongodb+srv://myprojecthplus:q6iDk2bDU7VEP9VX@projecth.17yi0.mongodb.net/?retryWrites=true&w=majority&appName=ProjectH';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Define the Survey Schema
const surveySchema = new mongoose.Schema({
  patientId: String,
  patientName: String,
  doctorId: String,
  visitDate: String,
  condition: String,
  healthProblem: String,
  medicines: String,
  image: Buffer,  // Store image as binary (Buffer)
});

const Survey = mongoose.model('Survey', surveySchema);

const otpSchema = new mongoose.Schema({
  patientId: String,
  otp: String,
  createdAt: { type: Date, default: Date.now, index: { expires: 300 } } // expires in 5 mins
});

const OTP = mongoose.model("OTP", otpSchema);

// Set up multer for handling file uploads
const storage = multer.memoryStorage();  // Store file in memory as a Buffer
const upload = multer({ storage: storage });

// Endpoint for handling the form submission
app.post('/submit-form', upload.single('image'), (req, res) => {
  const { patientId, patientName, doctorId, visitDate, condition, healthProblem, medicines } = req.body;
  const imageBuffer = req.file ? req.file.buffer : null;  // Store image as binary data (Buffer)

  const visitDateFormatted = new Date(visitDate).toISOString().split('T')[0];

  const newSurvey = new Survey({
    patientId,
    patientName,
    doctorId,
    visitDate: visitDateFormatted,
    condition,
    healthProblem,
    medicines,
    image: imageBuffer,
  });

  newSurvey.save()
    .then(() => {
      res.send('Survey data successfully uploaded');
    })
    .catch((err) => {
      console.error('Error saving survey data:', err);
      res.status(500).send('Error saving data');
    });
});

// Route to fetch all records from "formdatas" collection
app.get('/fetch-records', async (req, res) => {
  try {
    const records = await Survey.find({});
    res.json(records); // Send records as JSON to the client
  } catch (error) {
    console.error("Error fetching records:", error);
    res.status(500).json({ message: "Error fetching records. Please try again later." });
  }
});

app.get('/fetch-records', async (req, res) => {
  const { patientId } = req.query; // Assuming Patient ID is passed as a query parameter
  try {
    let records;
    if (patientId) {
      records = await Survey.find({ patientId }); // Filter by Patient ID
    } else {
      records = await Survey.find(); // Fetch all records
    }
    res.json(records);
  } catch (err) {
    console.error("Error fetching records:", err);
    res.status(500).json({ message: "Error fetching records" });
  }
});


// Route to fetch a specific record's image (as binary data)
app.get('/fetch-record/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const record = await Survey.findById(id);
    if (!record || !record.image) {
      return res.status(404).send('Image not found');
    }
    res.contentType('image/jpeg'); // or the appropriate image MIME type
    res.send(record.image);  // Send image buffer
  } catch (err) {
    console.error("Error fetching image:", err);
    res.status(500).send('Error fetching image');
  }
});

// Route to send OTP
app.post("/send-otp", async (req, res) => {
  const { patientId } = req.body;

  const phoneMapping = {
      PAH12345: "+919353006355",
      PAH12346: "+919035000678",
      PAH12347: "+917483132320"
  };

  const phoneNumber = phoneMapping[patientId];
  if (!phoneNumber) {
      return res.json({ success: false, message: "Invalid Patient ID." });
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

// Start the backend server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
