const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Usuario = require('../models/usuario');
const SessaoUsuario = require('../models/SessaoUsuario');
const { generateTokens, generateCsrfToken, verifyRefreshToken } = require('../services/tokenService');
const authWithCsrf = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, senha } = req.body;
  if (!username || !senha) {
    return res.status(400).json({ erro: 'Username e senha são obrigatórios' });
  }

  const usuario = await Usuario.findOne({ username });
  if (!usuario) {
    return res.status(401).json({ erro: 'Credenciais inválidas' });
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
  if (!senhaValida) {
    return res.status(401).json({ erro: 'Credenciais inválidas' });
  }

  const { accessToken, refreshToken } = generateTokens(usuario._id);
  const csrfToken = generateCsrfToken();
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  await SessaoUsuario.create({
    usuarioId: usuario._id,
    csrfToken,
    refreshTokenHash,
    expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    accessToken,
    csrfToken,
    usuario: { id: usuario._id, username: usuario.username, email: usuario.email, chavePix: usuario.chavePix }
  });
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ erro: 'Refresh token ausente' });
  }

  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) {
    return res.status(403).json({ erro: 'Refresh token inválido' });
  }

  const sessao = await SessaoUsuario.findOne({ usuarioId: decoded.userId });
  if (!sessao) {
    return res.status(403).json({ erro: 'Sessão não encontrada' });
  }

  const refreshOk = await bcrypt.compare(refreshToken, sessao.refreshTokenHash);
  if (!refreshOk) {
    return res.status(403).json({ erro: 'Refresh token inválido' });
  }

  const { accessToken } = generateTokens(decoded.userId);
  const novoCsrf = generateCsrfToken();
  sessao.csrfToken = novoCsrf;
  await sessao.save();

  res.json({ accessToken, csrfToken: novoCsrf });
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    const decoded = verifyRefreshToken(refreshToken);
    if (decoded) {
      await SessaoUsuario.deleteOne({ usuarioId: decoded.userId });
    }
  }
  res.clearCookie('refreshToken');
  res.json({ message: 'Logout realizado com sucesso' });
});

// GET /api/auth/perfil – retorna dados do usuário autenticado
router.get('/perfil', authWithCsrf, async (req, res) => {
  const usuario = await Usuario.findById(req.usuarioId).select('-senhaHash');
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
  res.json(usuario);
});

// PATCH /api/auth/perfil – atualiza chave PIX e/ou email
router.patch('/perfil', authWithCsrf, async (req, res) => {
  const { chavePix, email } = req.body;
  const update = {};

  if (chavePix !== undefined) {
    const chave = String(chavePix).trim();
    if (chave.length > 0 && chave.length > 50) {
      return res.status(400).json({ erro: 'Chave PIX inválida' });
    }
    if (chave) {
      const existe = await Usuario.findOne({ chavePix: chave, _id: { $ne: req.usuarioId } });
      if (existe) return res.status(409).json({ erro: 'Chave PIX já cadastrada' });
    }
    update.chavePix = chave;
  }

  if (email !== undefined) {
    const novoEmail = String(email).trim().toLowerCase();
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novoEmail);
    if (!emailValido) return res.status(400).json({ erro: 'Email inválido' });
    const existe = await Usuario.findOne({ email: novoEmail, _id: { $ne: req.usuarioId } });
    if (existe) return res.status(409).json({ erro: 'Email já cadastrado' });
    update.email = novoEmail;
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ erro: 'Nenhum dado para atualizar' });
  }

  const usuario = await Usuario.findByIdAndUpdate(req.usuarioId, update, { new: true }).select('-senhaHash');
  res.json(usuario);
});

module.exports = router;
