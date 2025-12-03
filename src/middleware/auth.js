// auth.js - MANTÉN ESTE ARCHIVO COMO ESTÁ
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ message: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // ✅ NUEVO: Mejoramos la normalización sin romper lo existente
    req.user = {
      id: payload.id || payload.sub || payload.userId,
      role: payload.role || payload.userRole || payload.roleName || 'client'
    };
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

function requireRole(roleOrArray) {
  const roles = Array.isArray(roleOrArray) ? roleOrArray : [roleOrArray];
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'No autenticado' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'No autorizado' });
    return next();
  };
}

// ✅ NUEVO: Middleware opcional para desarrollo
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.id || payload.sub || payload.userId,
      role: payload.role || payload.userRole || payload.roleName || 'client'
    };
  } catch (err) {
    // Si el token es inválido, continuamos sin usuario
  }
  return next();
}

module.exports = {
  requireAuth,
  requireRole,
  optionalAuth // ✅ NUEVO: Para rutas que pueden funcionar con o sin auth
};