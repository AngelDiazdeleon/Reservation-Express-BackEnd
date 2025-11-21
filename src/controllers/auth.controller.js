const User = require("../models/User.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Registro de usuario - ACTUALIZADA
async function register(req, res) {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Todos los campos son requeridos" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "El usuario ya existe" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hash,
      role: role || "client",
      phone: phone // ← QUITA la restricción del phone
    });

    await user.save();

    // CAMBIO: Usa 'id' en lugar de 'userId'
    const token = jwt.sign(
      { id: user._id, role: user.role }, // ← CAMBIA userId por id
      process.env.JWT_SECRET || "changeme",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone // ← AGREGA phone aquí
      },
    });
  } catch (e) {
    console.error("Error en registro:", e); 
    res.status(500).json({ message: "Error del servidor" });
  }
}

// Login de usuario - ACTUALIZADA
async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Email o contraseña inválida" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Email o contraseña inválida" });
    }

    // CAMBIO: Usa 'id' en lugar de 'userId'
    const token = jwt.sign(
      { id: user._id, role: user.role }, // ← CAMBIA userId por id
      process.env.JWT_SECRET || "changeme",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone // ← AGREGA phone aquí
      },
    });
  } catch (e) {
    res.status(500).json({ message: "Error del servidor" });
  }
}

// Perfil del usuario autenticado
// Perfil del usuario autenticado - TAMBIÉN ACTUALIZAR
  async function profile(req, res) {
    try {
      // CAMBIO: Usar req.user.id en lugar de req.userId
      const user = await User.findById(req.user.id).select("_id name email role phone");
      if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
      res.json({ user });
    } catch (e) {
      res.status(500).json({ message: "Error al obtener el perfil" });
    }
  }

// ✅ FUNCIÓN CORREGIDA: Actualizar perfil de usuario
async function updateProfile(req, res) {
  try {
    console.log('🎯 UPDATE PROFILE - Petición recibida');
    console.log('🔑 User ID:', req.user?.id);
    console.log('📦 Body:', req.body);
    console.log('📋 Headers:', req.headers.authorization ? 'Token presente' : 'Sin token');

    const { name, email, phone } = req.body;
    
    if (!name || !email) {
      console.log('❌ Error: Campos faltantes');
      return res.status(400).json({ message: "Nombre y email son requeridos" });
    }

    console.log('🔍 Buscando usuario con ID:', req.user.id);
    const user = await User.findById(req.user.id);
    console.log('👤 Usuario encontrado:', user ? user.email : 'NO ENCONTRADO');

    // Verificar si el email ya está en uso por otro usuario
    console.log('📧 Verificando email:', email);
    const existingUser = await User.findOne({ 
      email: email.toLowerCase(), 
      _id: { $ne: req.user.id }
    });
    
    if (existingUser) {
      console.log('❌ Email ya en uso por:', existingUser.email);
      return res.status(409).json({ message: "El email ya está en uso" });
    }

    console.log('💾 Actualizando usuario...');
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { 
        name, 
        email: email.toLowerCase(), 
        ...(phone !== undefined && { phone })
      },
      { new: true, runValidators: true }
    ).select("_id name email role phone");

    console.log('✅ Usuario actualizado:', updatedUser);

    res.json({
      message: "Perfil actualizado correctamente",
      user: updatedUser
    });
    
  } catch (e) {
    console.error('💥 ERROR en updateProfile:', e);
    res.status(500).json({ message: "Error del servidor: " + e.message });
  }
}

// ✅ NUEVA FUNCIÓN: Eliminar perfil de usuario
async function deleteProfile(req, res) {
  try {
    console.log('🗑️ DELETE PROFILE - Petición recibida');
    console.log('🔑 User ID a eliminar:', req.user?.id);

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Eliminar el usuario de la base de datos
    await User.findByIdAndDelete(req.user.id);

    console.log('✅ Usuario eliminado:', user.email);

    res.json({
      message: "Perfil eliminado correctamente"
    });
    
  } catch (e) {
    console.error('💥 ERROR en deleteProfile:', e);
    res.status(500).json({ message: "Error del servidor: " + e.message });
  }
}


module.exports = {
  register,
  login,
  profile,
  updateProfile, // ← Agrega esta exportación
  deleteProfile 
};