// terraceImages.routes.js - CORREGIDO
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Servir imágenes de terrazas
router.get('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    console.log('📤 Solicitando imagen de terraza:', filename);
    
    // 🚨 CORRECCIÓN: Cambia la ruta a donde realmente están tus imágenes
    const imagePath = path.join(__dirname, '../uploads/images', filename);
    
    console.log('🔍 Buscando imagen en:', imagePath);
    
    // Verificar si el archivo existe
    if (!fs.existsSync(imagePath)) {
      console.log('❌ Imagen no encontrada en:', imagePath);
      
      // Intentar en otra ubicación común
      const alternativePaths = [
        path.join(__dirname, '../../uploads/images', filename),
        path.join(__dirname, '../uploads/terrace-images', filename),
        path.join(__dirname, '../../uploads/terrace-images', filename)
      ];
      
      for (const altPath of alternativePaths) {
        if (fs.existsSync(altPath)) {
          console.log('✅ Encontrada en ubicación alternativa:', altPath);
          return sendImage(res, altPath, filename);
        }
      }
      
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada en ninguna ubicación',
        requested: filename,
        searchedPaths: [imagePath, ...alternativePaths]
      });
    }
    
    // Enviar la imagen
    sendImage(res, imagePath, filename);
    
  } catch (error) {
    console.error('💥 Error sirviendo imagen:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cargar la imagen',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Función auxiliar para enviar imágenes
function sendImage(res, filePath, filename) {
  try {
    // Determinar el tipo de contenido
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    
    const contentType = contentTypes[ext] || 'image/jpeg';
    
    // Configurar headers para caché
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 horas
    
    console.log('✅ Enviando imagen:', filename, 'desde:', filePath);
    res.sendFile(filePath);
    
  } catch (sendError) {
    console.error('💥 Error al enviar archivo:', sendError);
    res.status(500).send('Error al servir la imagen');
  }
}

module.exports = router;