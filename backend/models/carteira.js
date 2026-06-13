const mongoose = require('mongoose');

const carteiraSchema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  saldoBetHot: { type: Number, default: 0 },
  saldoHotcoin: { type: Number, default: 0 },
  saldoBloqueadoBetHot: { type: Number, default: 0 },
  historicoTransacoes: [
    {
      tipo: { type: String, trim: true },
      valor: { type: Number },
      descricao: { type: String, trim: true },
      data: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Carteira', carteiraSchema);
