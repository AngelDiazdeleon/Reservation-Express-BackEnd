// middleware/PublicationUpload.js
const multer = require('multer');
const path = require('path');

// Configurar almacenamiento temporal
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/temp');
    const fs = require('fs');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'terraza-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtrar solo imágenes
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10 // Máximo 10 archivos
  }
});

// Middleware para subir múltiples archivos
const publicationUpload = upload.fields([
  { name: 'photos', maxCount: 10 }
]);

module.exports = publicationUpload;