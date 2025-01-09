const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir); // Create the uploads directory if it doesn't exist
app.use('/uploads', express.static(uploadsDir));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kalpit:123@cluster0.w3gow.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1); // Exit the app if the database connection fails
  });

// Image Schema
const imageSchema = new mongoose.Schema({
  filename: String,
  path: String,
  gallery: String, // 'rotary' or 'redcross'
  uploadDate: { type: Date, default: Date.now }
});

const Image = mongoose.model('Image', imageSchema);

// Multer Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// API Routes

// Upload an image
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    const { gallery } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const newImage = new Image({
      filename: req.file.filename,
      path: `/uploads/${req.file.filename}`,
      gallery: gallery
    });
    await newImage.save();
    res.json({ success: true, image: newImage });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get images by gallery
app.get('/api/images/:gallery', async (req, res) => {
  try {
    const images = await Image.find({ gallery: req.params.gallery });
    res.json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete an image by ID
app.delete('/api/images/:id', async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }

    // Delete file from the server
    const filePath = path.join(__dirname, image.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Image.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Default Route for Health Check
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
