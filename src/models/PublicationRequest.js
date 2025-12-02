// models/PublicationRequest.js
const mongoose = require('mongoose');

const fileRefSchema = new mongoose.Schema({
  fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
  filename: { type: String },
  filePath: { type: String }, // ← AGREGAR ESTE CAMPO
  originalName: { type: String },
  mimetype: { type: String },
  fileType: { type: String, default: 'image' },
  size: { type: Number }
}, { _id: false });

const publicationRequestSchema = new mongoose.Schema({
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  terraceData: { 
    type: Object, 
    required: true 
  },
  photos: [fileRefSchema],
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  reviewedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  reviewedAt: { 
    type: Date 
  },
  adminNotes: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Índices para mejor performance
publicationRequestSchema.index({ owner: 1, createdAt: -1 });
publicationRequestSchema.index({ status: 1 });

module.exports = mongoose.model('PublicationRequest', publicationRequestSchema);