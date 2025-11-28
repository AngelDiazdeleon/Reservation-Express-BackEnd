const fs = require('fs');
const path = require('path');

class LocalFileService {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../../uploads/images');
    this.ensureUploadsDir();
  }

  ensureUploadsDir() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
      console.log('📁 Carpeta de imágenes creada:', this.uploadsDir);
    }
  }

  // Guardar archivo localmente
  saveFile(fileBuffer, originalName) {
    return new Promise((resolve, reject) => {
      try {
        const fileExtension = path.extname(originalName);
        const fileName = `img-${Date.now()}-${Math.random().toString(36).substring(7)}${fileExtension}`;
        const filePath = path.join(this.uploadsDir, fileName);

        fs.writeFile(filePath, fileBuffer, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              fileName: fileName,
              filePath: filePath,
              originalName: originalName
            });
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Obtener archivo
  getFile(fileName) {
    const filePath = path.join(this.uploadsDir, fileName);
    if (fs.existsSync(filePath)) {
      return fs.createReadStream(filePath);
    }
    return null;
  }

  // Eliminar archivo
  deleteFile(fileName) {
    return new Promise((resolve, reject) => {
      const filePath = path.join(this.uploadsDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve(true);
          }
        });
      } else {
        resolve(false);
      }
    });
  }
}

module.exports = new LocalFileService();