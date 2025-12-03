// routes/imageDebug.routes.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

router.get('/check-uploads', (req, res) => {
  try {
    const uploadsPath = path.join(__dirname, '../../uploads');
    const imagesPath = path.join(uploadsPath, 'images');
    
    const uploadsExists = fs.existsSync(uploadsPath);
    const imagesExists = fs.existsSync(imagesPath);
    
    let files = [];
    if (imagesExists) {
      files = fs.readdirSync(imagesPath);
    }
    
    res.json({
      success: true,
      uploads: {
        path: uploadsPath,
        exists: uploadsExists
      },
      images: {
        path: imagesPath,
        exists: imagesExists,
        files: files,
        count: files.length
      },
      urlExample: 'http://localhost:4000/uploads/images/' + (files[0] || 'filename.jpg'),
      serverInfo: {
        port: process.env.PORT || 4000,
        baseUrl: process.env.BASE_URL || 'http://localhost:4000'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;