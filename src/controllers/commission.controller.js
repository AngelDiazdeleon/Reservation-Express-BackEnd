// controllers/commission.controller.js
const Commission = require('../models/commission');

exports.createCommission = async (req, res) => {
  try {
    const commission = new Commission(req.body);
    await commission.save();
    res.status(201).json(commission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Otras funciones básicas si las necesitas