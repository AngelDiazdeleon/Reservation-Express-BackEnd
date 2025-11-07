import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import morgan from 'morgan';
import cors from 'cors';

// Importar rutas
import authRoutes from './routes/auth.routes.js';
// Puedes agregar más rutas aquí:
// import reservationRoutes from './routes/reservation.routes.js';
// import terraceRoutes from './routes/terrace.routes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Ruta base de prueba
app.get('/', (req, res) => res.json({ ok: true, name: 'Reservation Express API' }));

// Rutas principales
app.use('/api/auth', authRoutes);
// app.use('/api/reservations', reservationRoutes);
// app.use('/api/terraces', terraceRoutes);

const { PORT = 4000, MONGO_URI } = process.env;

// Conexión a MongoDB
mongoose.connect(MONGO_URI, { dbName: 'reservationExpress' })
  .then(() => {
    console.log('✅ Conectado a MongoDB:', mongoose.connection.name);
    app.listen(PORT, () => {
      console.log(`🚀 API corriendo en http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Error al conectar a MongoDB', err);
    process.exit(1);
  });
