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
    usuario: { id: usuario._id, username: usuario.username, email: usuario.email }
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

// Exemplo de rota protegida (qualquer rota que precisa de autenticação)
router.get('/perfil', authWithCsrf, async (req, res) => {
  const usuario = await Usuario.findById(req.usuarioId).select('-senhaHash');
  res.json(usuario);
});

module.exports = router;