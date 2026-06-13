const mongoose = require('mongoose');

const sessaoUsuarioSchema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  csrfToken: { type: String, required: true },
  refreshTokenHash: { type: String }, // hash do refresh token
  ultimoUso: { type: Date, default: Date.now },
  expiraEm: { type: Date, required: true } // mesma expiração do refresh token
});

module.exports = mongoose.model('SessaoUsuario', sessaoUsuarioSchema);