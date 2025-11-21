const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const imageService = require('./services/image.service');

const terraceRoutes = require('./routes/terrace.routes');
const imageRoutes = require('./routes/image.routes');
const permissionRoutes = require('./routes/permission.routes');
const authRoutes = require('./routes/auth.routes');
const publicationRequestRoutes = require('./routes/publicationRequest.routes');
const adminRoutes = require('./routes/admin.routes');
const reservationRoutes = require('./routes/reservation.routes');
const userRoutes = require('./routes/user.routes');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ✅ INICIALIZAR GRIDFS CUANDO SE CONECTE MONGODB
mongoose.connection.once('open', () => {
  imageService.initFromMongooseDb(mongoose.connection.db);
  console.log('✅ GridFS inicializado para almacenar imágenes');
});

// servir carpeta uploads (temporal)
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => res.json({ ok: true, name: 'Reservation Express API', version: '1.0' }));

// ✅ TODAS LAS RUTAS
app.use('/api/auth', authRoutes);
app.use('/api/terraces', terraceRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/publication-requests', publicationRequestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reservations', reservationRoutes);


app.use('/api/user', userRoutes); // ← Esto debe estar
module.exports = app;