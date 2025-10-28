// authMiddleware.js
const jwt = require('jsonwebtoken');

// Middleware de autenticação
module.exports = function (req, res, next) {
  const authHeader = req.headers['authorization'];

  // O token vem no formato: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token de autenticação não fornecido.' });
  }

  try {
    // Verifica o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Armazena o usuário decodificado na requisição
    req.user = decoded.user;

    // Continua o fluxo
    next();
  } catch (err) {
    console.error('Erro ao verificar token JWT:', err.message);
    res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
};
