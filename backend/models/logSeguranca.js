const mongoose = require('mongoose');

const logSegurancaSchema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  acao: { type: String, required: true, trim: true },
  ip: { type: String, trim: true },
  userAgent: { type: String, trim: true },
  sucesso: { type: Boolean, default: false },
  detalhes: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('LogSeguranca', logSegurancaSchema);
