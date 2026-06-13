const express = require('express');
const router = express.Router();
const authWithCsrf = require('../middleware/auth');
const Carteira = require('../models/carteira');

// Taxa de conversão: 1000 BetHot = 1 Hotcoin
const BETHOT_POR_HOTCOIN = 1000;
const MINIMO_CONVERSAO = 1000;

// GET /api/carteira – retorna saldo da carteira do usuário
router.get('/', authWithCsrf, async (req, res) => {
  let carteira = await Carteira.findOne({ usuarioId: req.usuarioId });
  // Cria carteira sob demanda caso o usuário ainda não possua uma
  if (!carteira) {
    carteira = await Carteira.create({ usuarioId: req.usuarioId });
  }
  res.json({
    saldoBetHot: carteira.saldoBetHot,
    saldoHotcoin: carteira.saldoHotcoin,
    saldoBloqueadoBetHot: carteira.saldoBloqueadoBetHot,
    historicoTransacoes: carteira.historicoTransacoes.slice(-20).reverse(),
  });
});

// POST /api/carteira/converter – converte BetHot em Hotcoin
router.post('/converter', authWithCsrf, async (req, res) => {
  const quantidadeBetHot = Number(req.body.quantidadeBetHot);

  if (!Number.isFinite(quantidadeBetHot) || quantidadeBetHot <= 0) {
    return res.status(400).json({ erro: 'Quantidade inválida' });
  }
  if (quantidadeBetHot < MINIMO_CONVERSAO) {
    return res.status(400).json({ erro: `Mínimo de ${MINIMO_CONVERSAO} BetHot para converter` });
  }
  if (quantidadeBetHot % BETHOT_POR_HOTCOIN !== 0) {
    return res.status(400).json({ erro: `A quantidade deve ser múltipla de ${BETHOT_POR_HOTCOIN}` });
  }

  const carteira = await Carteira.findOne({ usuarioId: req.usuarioId });
  if (!carteira) return res.status(404).json({ erro: 'Carteira não encontrada' });
  if (carteira.saldoBetHot < quantidadeBetHot) {
    return res.status(400).json({ erro: 'Saldo BetHot insuficiente' });
  }

  const hotcoinGanho = Math.floor(quantidadeBetHot / BETHOT_POR_HOTCOIN);

  carteira.saldoBetHot -= quantidadeBetHot;
  carteira.saldoHotcoin += hotcoinGanho;
  carteira.historicoTransacoes.push({
    tipo: 'conversao',
    valor: hotcoinGanho,
    descricao: `Conversão de ${quantidadeBetHot} BetHot em ${hotcoinGanho} Hotcoin`,
  });
  await carteira.save();

  res.json({
    message: 'Conversão realizada com sucesso',
    hotcoinGanho,
    saldoBetHot: carteira.saldoBetHot,
    saldoHotcoin: carteira.saldoHotcoin,
  });
});

module.exports = router;
