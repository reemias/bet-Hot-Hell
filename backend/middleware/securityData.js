const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0] : req.ip || req.socket.remoteAddress;
  return ip === '::1' ? '127.0.0.1' : ip;
};

const securityMiddleware = (req, res, next) => {
  req.clientInfo = {
    ip: getClientIp(req),
    userAgent: req.headers['user-agent'] || 'desconhecido',
    acceptLanguage: req.headers['accept-language'] || '',
    referer: req.headers['referer'] || '',
    timestamp: new Date(),
  };
  next();
};

module.exports = securityMiddleware;