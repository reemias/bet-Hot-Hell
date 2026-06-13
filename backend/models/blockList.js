const mongoose = require('mongoose');

const blockListSchema = new mongoose.Schema({
  ip: { type: String, required: true, trim: true },
  bloqueadoAte: { type: Date, required: true },
  motivo: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('BlockList', blockListSchema);
