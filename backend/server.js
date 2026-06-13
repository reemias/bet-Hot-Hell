require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cadastroRoutes = require('./router/cadastro');
const cookieParser = require('cookie-parser');


const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : ['http://localhost:5173'];

const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS não permitido'));
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: false,
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});
app.use((req, res, next) => {
  if (req.method === 'GET') return next();
  if (req.is('application/json')) return next();
  return res.status(415).json({ erro: 'Content-Type deve ser application/json' });
});

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('❌ MONGODB_URI não definido. Defina em .env');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => {
    console.error('❌ Erro ao conectar MongoDB:', err);
    process.exit(1);
  });

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Backend Bet Hotel ativo' });
});

app.use(cookieParser());

app.use('/api/cadastro', cadastroRoutes);

const authRoutes = require('./router/auth');
app.use('/api/auth', authRoutes);

/** @type {import('express').ErrorRequestHandler} */
const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);
  const message = err.message || 'Erro interno do servidor';
  const status = message.includes('Falha no envio do e-mail de verificação') ? 502 : 500;
  res.status(status).json({ erro: message });
};

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));