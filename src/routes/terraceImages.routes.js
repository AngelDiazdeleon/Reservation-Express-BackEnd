//terraceImages.routes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Servir imágenes de terrazas
router.get('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    console.log('📤 Solicitando imagen:', filename);
    
    // Ruta donde se guardan las imágenes (debe coincidir con tu LocalFileService)
    const imagePath = path.join(__dirname, '../uploads/terrace-images', filename);
    
    // Verificar si el archivo existe
    if (!fs.existsSync(imagePath)) {
      console.log('❌ Imagen no encontrada:', imagePath);
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      });
    }
    
    // Determinar el tipo de contenido
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    
    const contentType = contentTypes[ext] || 'image/jpeg';
    
    console.log('✅ Enviando imagen:', filename);
    res.setHeader('Content-Type', contentType);
    res.sendFile(imagePath);
    
  } catch (error) {
    console.error('💥 Error sirviendo imagen:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cargar la imagen'
    });
  }
});

module.exports = router;