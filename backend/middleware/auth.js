const { verifyAccessToken } = require('../services/tokenService');
const SessaoUsuario = require('../models/SessaoUsuario');

const authWithCsrf = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  const csrfToken = req.headers['x-csrf-token'];

  if (!token || !csrfToken) {
    return res.status(401).json({ erro: 'Token ou CSRF ausente' });
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  const sessao = await SessaoUsuario.findOne({ usuarioId: decoded.userId, csrfToken });
  if (!sessao) {
    return res.status(403).json({ erro: 'CSRF inválido' });
  }

  // Gera novo CSRF para próxima requisição
  const { generateCsrfToken } = require('../services/tokenService');
  const novoCsrf = generateCsrfToken();
  sessao.csrfToken = novoCsrf;
  sessao.ultimoUso = new Date();
  await sessao.save();

  // Envia novo CSRF no header da resposta
  res.setHeader('X-New-CSRF-Token', novoCsrf);
  req.usuarioId = decoded.userId;
  next();
};

module.exports = authWithCsrf;