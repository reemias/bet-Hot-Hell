const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Usuario = require('../models/usuario');
const CadastroPendente = require('../models/cadastroPendente');
const SessaoCadastro = require('../models/sessaoCadastro');
const Carteira = require('../models/carteira');
const ConfiguracaoUsuario = require('../models/configuracaoUsuario');
const LogSeguranca = require('../models/logSeguranca');
const BlockList = require('../models/blockList');
const { enviarCodigo } = require('../services/emailService');
const securityMiddleware = require('../middleware/securityData');
const {
  sanitizeString,
  sanitizeEmail,
  sanitizeCPF,
  sanitizePhone,
  sanitizeBoolean,
  sanitizeToken,
  sanitizeUsername,
  sanitizePix,
  sanitizeDocument,
  sanitizeCode,
  sanitizeDate,
  isValidEmail,
  isValidCPF,
  isValidPhone,
  isValidUsername,
  isValidVerificationCode,
  isValidObjectId,
  isValidDate,
} = require('../utils/validators');

const gerarCodigo = () => Math.floor(100000 + Math.random() * 900000).toString();

const prepararCadastroPendente = (body) => {
  const nome = sanitizeString(body.nome, 100);
  const email = sanitizeEmail(body.email);
  const cpf = sanitizeCPF(body.cpf);
  const telefone = sanitizePhone(body.telefone);
  const aceite_termos = sanitizeBoolean(body.aceite_termos);
  const nao_robo = sanitizeBoolean(body.nao_robo);

  const erros = [];
  if (!nome || nome.length < 3) erros.push('Nome inválido ou muito curto');
  if (!email || !isValidEmail(email)) erros.push('Email inválido');
  if (!cpf || !isValidCPF(cpf)) erros.push('CPF inválido');
  if (!telefone || !isValidPhone(telefone)) erros.push('Telefone inválido');
  if (!aceite_termos) erros.push('É necessário aceitar os termos');
  if (!nao_robo) erros.push('Confirmação de não ser robô é obrigatória');

  return { erros, dados: { nome, email, cpf, telefone, aceite_termos, nao_robo } };
};

// Rota para verificar disponibilidade de username e/ou chave PIX (GET)
router.get('/check-disponibilidade', async (req, res) => {
  const username = req.query.username ? sanitizeUsername(String(req.query.username)) : undefined;
  const chavePix = req.query.chavePix ? sanitizePix(String(req.query.chavePix)).slice(0, 50) : undefined;

  if (req.query.username && !username) {
    return res.status(400).json({ erro: 'Username inválido' });
  }

  if (req.query.chavePix && !chavePix.trim()) {
    return res.status(400).json({ erro: 'Chave PIX inválida' });
  }

  const resultado = { disponivel: true, campos: {} };

  try {
    if (username) {
      const existe = await Usuario.findOne({ username });
      resultado.campos.username = !existe;
      if (existe) resultado.disponivel = false;
    }
    if (chavePix) {
      const existe = await Usuario.findOne({ chavePix });
      resultado.campos.chavePix = !existe;
      if (existe) resultado.disponivel = false;
    }
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao verificar disponibilidade' });
  }
});

// ROTA 1 – INICIAR
router.post('/iniciar', securityMiddleware, async (req, res, next) => {
  const { erros, dados } = prepararCadastroPendente(req.body);
  if (erros.length) return res.status(400).json({ erro: erros[0] });

  const { nome, email, cpf, telefone, aceite_termos, nao_robo } = dados;
  const cpfLimpo = cpf;

  try {

    // Bloqueio por IP (muitas tentativas)
    const bloqueado = await BlockList.findOne({
      ip: req.clientInfo.ip,
      bloqueadoAte: { $gt: new Date() }
    });
    if (bloqueado) return res.status(429).json({ erro: 'IP bloqueado temporariamente. Tente mais tarde.' });

    // Limitar tentativas por IP (ex: 3 por dia)
    const tentativasHoje = await CadastroPendente.countDocuments({
      ipRegistro: req.clientInfo.ip,
      createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    if (tentativasHoje >= 3) {
      return res.status(429).json({ erro: 'Muitas tentativas com este IP. Aguarde 24h.' });
    }

    // Verificar duplicidade
    const existente = await Usuario.findOne({ $or: [{ email: email.toLowerCase() }, { cpf: cpfLimpo }] });
    const existentePendente = await CadastroPendente.findOne({ $or: [{ email: email.toLowerCase() }, { cpf: cpfLimpo }] });
    if (existente || existentePendente) {
      return res.status(409).json({ erro: 'Email ou CPF já cadastrado ou em processo de verificação' });
    }

    const codigo = gerarCodigo();
    const expiracao = new Date(Date.now() + 10 * 60 * 1000);

    const cadastro = new CadastroPendente({
      nome,
      email: email.toLowerCase(),
      cpf: cpfLimpo,
      telefone,
      aceite_termos,
      nao_robo,
      codigoVerificacao: codigo,
      codigoExpiracao: expiracao,
      ipRegistro: req.clientInfo.ip,
      userAgent: req.clientInfo.userAgent,
      acceptLanguage: req.clientInfo.acceptLanguage,
      referer: req.clientInfo.referer,
    });
    await cadastro.save();
    await enviarCodigo(email, codigo);

    // Log de segurança
    await LogSeguranca.create({
      acao: 'cadastro_iniciado',
      ip: req.clientInfo.ip,
      userAgent: req.clientInfo.userAgent,
      sucesso: true,
      detalhes: { email, cadastroId: cadastro._id }
    });

    res.status(200).json({ message: 'Código enviado para o e-mail', cadastroId: cadastro._id });
  } catch (err) {
    next(err);
  }
});

// ROTA 2 – VERIFICAR CÓDIGO
router.post('/verificar', securityMiddleware, async (req, res, next) => {
  const cadastroId = sanitizeString(req.body.cadastroId, 24);
  const codigo = sanitizeCode(req.body.codigo);

  if (!cadastroId || !codigo || !isValidObjectId(cadastroId) || !isValidVerificationCode(codigo)) {
    return res.status(400).json({ erro: 'Dados de verificação inválidos' });
  }

  try {
    const cadastro = await CadastroPendente.findById(cadastroId);
    if (!cadastro) return res.status(404).json({ erro: 'Cadastro não encontrado ou já verificado' });
    if (cadastro.codigoVerificacao !== codigo) return res.status(401).json({ erro: 'Código inválido' });
    if (!cadastro.codigoExpiracao || new Date() > cadastro.codigoExpiracao) return res.status(410).json({ erro: 'Código expirado' });

    // Gera token de sessão para o segundo fluxo (válido por 30 min)
    const token = crypto.randomBytes(32).toString('hex');
    await SessaoCadastro.create({
      cadastroPendenteId: cadastroId,
      token,
      expiracao: new Date(Date.now() + 30 * 60 * 1000)
    });

    await LogSeguranca.create({
      acao: 'codigo_verificado',
      ip: req.clientInfo.ip,
      userAgent: req.clientInfo.userAgent,
      sucesso: true,
      detalhes: { cadastroId }
    });

    res.json({ token, message: 'Código válido. Complete seu perfil.' });
  } catch (err) {
    next(err);
  }
});

// ROTA 3 – COMPLETAR PERFIL (username, senha, idade etc.)
router.post('/completar', securityMiddleware, async (req, res, next) => {
  const token = sanitizeToken(req.body.token);
  const username = sanitizeUsername(req.body.username);
  const senha = sanitizeString(req.body.senha, 128);
  const dataNascimento = sanitizeDate(req.body.dataNascimento);
  const chavePix = req.body.chavePix ? sanitizePix(req.body.chavePix) : undefined;
  const documento = req.body.documento ? sanitizeDocument(req.body.documento) : undefined;

  if (!token || !username || !senha || !dataNascimento) {
    return res.status(400).json({ erro: 'Token, username, senha e data de nascimento são obrigatórios' });
  }
  if (!isValidUsername(username)) {
    return res.status(400).json({ erro: 'Username inválido. Use 3-30 caracteres alfanuméricos, _ . ou -.' });
  }
  if (senha.length < 6 || senha.length > 128) {
    return res.status(400).json({ erro: 'Senha deve ter entre 6 e 128 caracteres' });
  }
  if (!isValidDate(dataNascimento)) {
    return res.status(400).json({ erro: 'Data de nascimento inválida' });
  }
  
  if (chavePix && chavePix.length > 50) {
    return res.status(400).json({ erro: 'Chave PIX inválida' });
  }
  if (documento && documento.length > 50) {
    return res.status(400).json({ erro: 'Documento inválido' });
  }

  try {
    const sessao = await SessaoCadastro.findOne({ token, expiracao: { $gt: new Date() } });
    if (!sessao) return res.status(401).json({ erro: 'Sessão inválida ou expirada' });

    const pendente = await CadastroPendente.findById(sessao.cadastroPendenteId);
    if (!pendente) return res.status(404).json({ erro: 'Dados de cadastro não encontrados' });

    // Verificar idade mínima (18 anos)
    const nascimento = new Date(dataNascimento);
    const hoje = new Date();

    // 1. Impedir data de nascimento futura
    if (nascimento > hoje) {
      return res.status(400).json({ erro: 'Data de nascimento não pode ser futura.' });
    }

    // 2. Calcular idade exata (anos completos)
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    const dia = hoje.getDate() - nascimento.getDate();
    if (mes < 0 || (mes === 0 && dia < 0)) {
      idade--;
    }

    if (idade < 18) {
      return res.status(400).json({ erro: 'Você deve ter pelo menos 18 anos para se cadastrar.' });
    }

    // Verificar username único
    const usernameExiste = await Usuario.findOne({ username });
    if (usernameExiste) return res.status(409).json({ erro: 'Username já está em uso' });
    if (chavePix) {
      const pixExiste = await Usuario.findOne({ chavePix });
      if (pixExiste) return res.status(409).json({ erro: 'Chave PIX já cadastrada' });
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Criar usuário definitivo
    const usuario = new Usuario({
      nome: pendente.nome,
      email: pendente.email,
      cpf: pendente.cpf,
      telefone: pendente.telefone,
      aceite_termos: pendente.aceite_termos,
      nao_robo: pendente.nao_robo,
      verificado: true,
      username,
      senhaHash,
      dataNascimento: nascimento,
      chavePix,
      documentoIdentidade: documento,
      ultimoIp: req.clientInfo.ip,
      ultimoUserAgent: req.clientInfo.userAgent,
      ipsAnteriores: [{ ip: req.clientInfo.ip, userAgent: req.clientInfo.userAgent, data: new Date() }]
    });
    await usuario.save();

    // Criar carteira com bônus (ex: 500 BetHot)
    await Carteira.create({
      usuarioId: usuario._id,
      saldoBetHot: 500,
      saldoHotcoin: 0,
      saldoBloqueadoBetHot: 0
    });

    // Criar configurações padrão
    await ConfiguracaoUsuario.create({
      usuarioId: usuario._id,
      notificacoesEmail: true,
      doisFatoresHabilitado: false,
      idioma: 'pt-BR',
      moedaPreferida: 'BetHot',
      limitesAposta: { diario: 5000, semanal: 20000 }
    });

    // Limpar dados temporários
    await CadastroPendente.findByIdAndDelete(pendente._id);
    await SessaoCadastro.findByIdAndDelete(sessao._id);

    // Log de sucesso
    await LogSeguranca.create({
      usuarioId: usuario._id,
      acao: 'perfil_completado',
      ip: req.clientInfo.ip,
      userAgent: req.clientInfo.userAgent,
      sucesso: true
    });

    res.status(201).json({ message: 'Cadastro concluído com sucesso! Faça login.' });
  } catch (err) {
    next(err);
  }
});

// ROTA 4 – REENVIAR CÓDIGO (apenas se ainda pendente)
router.post('/reenviar', securityMiddleware, async (req, res, next) => {
  const cadastroId = sanitizeString(req.body.cadastroId, 24);
  if (!cadastroId || !isValidObjectId(cadastroId)) return res.status(400).json({ erro: 'ID do cadastro inválido' });

  try {
    const cadastro = await CadastroPendente.findById(cadastroId);
    if (!cadastro) return res.status(404).json({ erro: 'Cadastro não encontrado ou já verificado' });

    // Limitar reenvios por IP/hora
    const reenvios = await CadastroPendente.countDocuments({
      _id: cadastroId,
      updatedAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) }
    });
    if (reenvios >= 3) {
      return res.status(429).json({ erro: 'Muitos reenvios. Aguarde 1 hora.' });
    }

    const novoCodigo = gerarCodigo();
    cadastro.codigoVerificacao = novoCodigo;
    cadastro.codigoExpiracao = new Date(Date.now() + 10 * 60 * 1000);
    await cadastro.save();

    await enviarCodigo(cadastro.email, novoCodigo);
    res.json({ message: 'Novo código enviado' });
  } catch (err) {
    next(err);
  }
});



module.exports = router;