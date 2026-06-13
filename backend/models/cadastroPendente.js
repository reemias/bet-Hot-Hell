// models/cadastroPendente.js
const mongoose = require('mongoose');

const cadastroPendenteSchema = new mongoose.Schema({
    nome: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    cpf: { type: String, required: true, trim: true },
    telefone: { type: String, required: true, trim: true },
    aceite_termos: { type: Boolean, required: true },
    nao_robo: { type: Boolean, required: true },
    codigoVerificacao: { type: String, required: true },
    codigoExpiracao: { type: Date, required: true },
    // novos campos de segurança
    ipRegistro: { type: String, required: true },
    userAgent: { type: String, required: true },
    acceptLanguage: { type: String },
    referer: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('CadastroPendente', cadastroPendenteSchema);