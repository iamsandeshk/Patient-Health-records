const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3500;

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS, etc.)
app.use(express.static(path.join(__dirname, 'public'))); // Place your Patient.html and other frontend files inside 'public' folder

// Connect to MongoDB (replace with your MongoDB URI)
mongoose.connect('mongodb+srv://@projecth.17yi0.mongodb.net/test?retryWrites=true&w=majority&appName=ProjectH')
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch(err => {
    console.log("MongoDB connection error:", err);
  });

// Schema and model for form data
const formDataSchema = new mongoose.Schema({
  patientId: String,
  patientName: String,
  doctorId: String,
  visitDate: String,
  condition: String,
  healthProblem: String,
  medicines: String,
  image: Buffer // Store image data as binary (Buffer)
});

const FormData = mongoose.model('FormData', formDataSchema, 'surveys'); // Explicitly specify "formdatas"

// Route to serve the Patient.html page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Patient.html')); // Ensure 'Patient.html' exists in the 'public' folder
});

// Route to fetch all records with patientId 'PAH12345'
app.get('/fetch-records', async (req, res) => {
  try {
    // Fetch all records where patientId is 'PAH12345'
    const records = await FormData.find({ patientId: 'PAH12345' });

    if (records.length > 0) {
      res.json(records); // Send an array of records as JSON
    } else {
      res.status(404).json({ message: "No records found for patient ID PAH12345." });
    }
  } catch (error) {
    console.error("Error fetching records:", error);
    res.status(500).json({ message: "Error fetching records. Please try again later." });
  }
});

// Route to fetch specific record's document (image)
app.get('/fetch-record/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Fetch the record by its ID
    const record = await FormData.findById(id);
    if (!record || !record.image) {
      return res.status(404).send('Document not found.');
    }
    
    // Send the image as binary data
    res.set('Content-Type', 'image/jpeg');  // Adjust this based on the image type (jpg, png, etc.)
    res.send(record.image);
  } catch (error) {
    res.status(500).json({ message: "Error fetching document. Please try again later." });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

});
