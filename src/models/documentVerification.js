//documentVerification.js
const mongoose = require('mongoose');

const documentVerificationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['identificacion', 'permisos_terrazas', 'comprobante_domicilio', 'general'],
    index: true
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'under_review'],
    default: 'pending',
    index: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  reviewDate: {
    type: Date
  },
  reviewedBy: {
    type: String
  },
  adminNotes: {
    type: String
  }
}, {
  timestamps: true
});

// Índices compuestos para mejor performance
documentVerificationSchema.index({ userId: 1, status: 1 });
documentVerificationSchema.index({ userId: 1, category: 1 });
documentVerificationSchema.index({ uploadDate: -1 });

module.exports = mongoose.model('DocumentVerification', documentVerificationSchema);