const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const PORT = 4000;
const multer = require('multer');

// Configure multer storage
const storage = multer.memoryStorage(); // Use memory storage for Buffer
const upload = multer({ storage });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect('mongodb+srv://myprojecthplus:q6iDk2bDU7VEP9VX@projecth.17yi0.mongodb.net/?retryWrites=true&w=majority&appName=ProjectH', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.log("MongoDB connection error:", err));

// Schemas
const patientSchema = new mongoose.Schema({
    registrationId: String,
    fullName: String,
    dob: Date,
    gender: String,
    address: String,
    age: Number,
    height: Number,
    weight: Number,
    bloodGroup: String,
    mobile: {
        type: String,
        unique: true, // Ensures uniqueness
        required: true
    }
});

const doctorSchema = new mongoose.Schema({
    registrationId: String,
    fullName: String,
    dob: Date,
    gender: String,
    address: String,
    age: Number,
    height: Number,
    weight: Number,
    bloodGroup: String,
    specialty: String,
    licenseDoc: Buffer,
    mobile: {
        type: String,
        unique: true, // Ensures uniqueness
        required: true
    }
});

const Patient = mongoose.model('Patient', patientSchema);
const Doctor = mongoose.model('Doctor', doctorSchema);

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/register', async (req, res) => {
    try {
        const { role, ...userData } = req.body;
        let newUser;

        if (role === 'patient') {
            newUser = new Patient(userData);
        } else if (role === 'doctor') {
            newUser = new Doctor(userData);
        } else {
            return res.status(400).json({ message: 'Invalid role specified' });
        }

        await newUser.save();

        res.status(200).json({ 
            message: 'Registration successful',
            registrationId: userData.registrationId
        });
    } catch (error) {
        console.error('Registration error:', error); // Log the complete error object
        // Catch-all for other errors
        res.status(500).json({ message: 'Registration failed. Please try again.' });
    }
});


// Keep your existing endpoints
app.use(express.static(__dirname));

app.get('/public', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});