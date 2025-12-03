require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const imageService = require('./services/image.service');

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    const conn = await connectDB();
    // Inicializa GridFS con la misma conexión
    imageService.initFromMongooseDb(conn.connection.db);
    console.log('GridFS inicializado');

    app.listen(PORT, () => {
      console.log('Servidor corriendo en http://localhost:${PORT}');
    });
  } catch (error) {
    console.error('Error iniciando servidor:', error);
    process.exit(1);
  }
}

startServer();