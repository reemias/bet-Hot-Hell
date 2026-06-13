// models/usuario.js
const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
    nome: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    cpf: { type: String, required: true, unique: true, trim: true },
    telefone: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    senhaHash: { type: String, required: true },
    dataNascimento: { type: Date, required: true },
    chavePix: { type: String, trim: true },
    documentoIdentidade: { type: String, trim: true },
    aceite_termos: { type: Boolean, required: true },
    nao_robo: { type: Boolean, required: true },
    verificado: { type: Boolean, default: true },
    statusVerificacao: { type: String, enum: ['pendente', 'verificado', 'reprovado'], default: 'verificado' },
    ultimoIp: { type: String },
    ultimoUserAgent: { type: String },
    ipsAnteriores: [{ ip: String, userAgent: String, data: Date }],
    bloqueado: { type: Boolean, default: false },
    motivoBloqueio: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Usuario', usuarioSchema);