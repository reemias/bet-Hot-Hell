const express = require('express');
const router = express.Router();
const axios = require('axios');
const authWithCsrf = require('../middleware/auth');
const Carteira = require('../models/carteira');
const PedidoCompra = require('../models/pedidoCompra');

// Configuração de conversão e integração
const BETHOT_POR_BRL = Number(process.env.BETHOT_POR_BRL || 50); // R$1 = 50 BetHot
const VALOR_MINIMO_BRL = Number(process.env.COMPRA_VALOR_MINIMO || 10);
const SYNC_API_URL = process.env.SYNC_API_URL || 'https://api.syncpayments.com.br/v1/pix/qrcode';
const SYNC_CLIENT_ID = process.env.SYNC_CLIENT_ID;
const SYNC_CLIENT_SECRET = process.env.SYNC_CLIENT_SECRET;

// POST /api/compras/criar-pix – gera cobrança PIX via Sync Payments
router.post('/criar-pix', authWithCsrf, async (req, res, next) => {
  const valorBRL = Number(req.body.valorBRL);

  if (!Number.isFinite(valorBRL) || valorBRL < VALOR_MINIMO_BRL) {
    return res.status(400).json({ erro: `Valor mínimo é R$${VALOR_MINIMO_BRL}` });
  }

  if (!SYNC_CLIENT_ID || !SYNC_CLIENT_SECRET) {
    return res.status(503).json({
      erro: 'Integração de pagamento indisponível. Defina SYNC_CLIENT_ID e SYNC_CLIENT_SECRET no .env',
    });
  }

  const betHotAmount = Math.floor(valorBRL * BETHOT_POR_BRL);

  try {
    const syncResponse = await axios.post(
      SYNC_API_URL,
      {
        amount: valorBRL,
        description: `Compra de ${betHotAmount} BetHot`,
      },
      {
        auth: { username: SYNC_CLIENT_ID, password: SYNC_CLIENT_SECRET },
        timeout: 15000,
      }
    );

    const data = syncResponse.data || {};
    const qrcode = data.qrcode || data.pixCopiaECola || data.copyPaste;
    const qrcodeImagem = data.qrcodeImage || data.imagemQrcode || data.qrCodeImage;
    const txid = data.txid || data.transactionId || data.id;

    const pedido = await PedidoCompra.create({
      usuarioId: req.usuarioId,
      valorBRL,
      betHotAmount,
      txid,
      qrcode,
      qrcodeImagem,
      status: 'pendente',
    });

    res.json({
      pedidoId: pedido._id,
      qrcode,
      qrcodeImagem,
      txid,
      betHotAmount,
      valorBRL,
      status: pedido.status,
    });
  } catch (err) {
    if (err.response) {
      return res.status(502).json({ erro: 'Falha ao gerar cobrança PIX na Sync Payments' });
    }
    next(err);
  }
});

// GET /api/compras/status/:pedidoId – consulta status de um pedido
router.get('/status/:pedidoId', authWithCsrf, async (req, res) => {
  const pedido = await PedidoCompra.findOne({
    _id: req.params.pedidoId,
    usuarioId: req.usuarioId,
  });
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });
  res.json({ pedidoId: pedido._id, status: pedido.status, betHotAmount: pedido.betHotAmount });
});

// POST /api/compras/webhook-pix – chamado pela Sync Payments ao confirmar pagamento
router.post('/webhook-pix', async (req, res) => {
  const txid = req.body.txid || req.body.transactionId || req.body.id;
  const status = req.body.status;

  // Considera diferentes nomenclaturas de "pago"
  const pago = ['paid', 'pago', 'approved', 'completed', 'confirmed'].includes(
    String(status).toLowerCase()
  );

  if (!txid || !pago) {
    return res.sendStatus(200);
  }

  const pedido = await PedidoCompra.findOne({ txid });
  if (pedido && pedido.status === 'pendente') {
    let carteira = await Carteira.findOne({ usuarioId: pedido.usuarioId });
    if (!carteira) {
      carteira = await Carteira.create({ usuarioId: pedido.usuarioId });
    }
    carteira.saldoBetHot += pedido.betHotAmount;
    carteira.historicoTransacoes.push({
      tipo: 'compra',
      valor: pedido.betHotAmount,
      descricao: `Compra de ${pedido.betHotAmount} BetHot (R$${pedido.valorBRL})`,
    });
    await carteira.save();

    pedido.status = 'concluido';
    await pedido.save();
  }

  res.sendStatus(200);
});

module.exports = router;
