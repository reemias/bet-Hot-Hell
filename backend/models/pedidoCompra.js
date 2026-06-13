const mongoose = require('mongoose');

const pedidoCompraSchema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
  valorBRL: { type: Number, required: true },
  betHotAmount: { type: Number, required: true },
  txid: { type: String, index: true },
  qrcode: { type: String },
  qrcodeImagem: { type: String },
  status: { type: String, enum: ['pendente', 'concluido', 'falhou'], default: 'pendente' },
}, { timestamps: true });

module.exports = mongoose.model('PedidoCompra', pedidoCompraSchema);
