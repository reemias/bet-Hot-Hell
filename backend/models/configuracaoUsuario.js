const mongoose = require('mongoose');

const configuracaoUsuarioSchema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  notificacoesEmail: { type: Boolean, default: true },
  doisFatoresHabilitado: { type: Boolean, default: false },
  idioma: { type: String, default: 'pt-BR' },
  moedaPreferida: { type: String, default: 'BetHot' },
  limitesAposta: {
    diario: { type: Number, default: 5000 },
    semanal: { type: Number, default: 20000 }
  }
}, { timestamps: true });

module.exports = mongoose.model('ConfiguracaoUsuario', configuracaoUsuarioSchema);
