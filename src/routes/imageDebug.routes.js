// routes/imageDebug.routes.js (temporal)
const express = require('express');
const router = express.Router();
const localFileService = require('../services/localFile.service');
const fs = require('fs');
const path = require('path');

// Ruta para verificar archivos
router.get('/check-file/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(localFileService.uploadsDir, filename);
    const exists = fs.existsSync(filePath);
    
    console.log('🔍 Verificando archivo:', {
      filename,
      filePath,
      exists,
      uploadsDir: localFileService.uploadsDir
    });
    
    res.json({
      success: true,
      filename: filename,
      filePath: filePath,
      exists: exists,
      uploadsDir: localFileService.uploadsDir
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Listar todos los archivos
router.get('/list-files', (req, res) => {
  try {
    const uploadsDir = localFileService.uploadsDir;
    const files = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
    
    res.json({
      success: true,
      uploadsDir: uploadsDir,
      files: files,
      totalFiles: files.length,
      directoryExists: fs.existsSync(uploadsDir)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;