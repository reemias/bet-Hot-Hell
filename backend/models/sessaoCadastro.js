const mongoose = require('mongoose');

const sessaoCadastroSchema = new mongoose.Schema({
  cadastroPendenteId: { type: mongoose.Schema.Types.ObjectId, ref: 'CadastroPendente', required: true },
  token: { type: String, required: true, unique: true },
  expiracao: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('SessaoCadastro', sessaoCadastroSchema);