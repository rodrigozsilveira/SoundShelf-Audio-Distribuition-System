const express = require('express');
const cors = require('cors');
const multer = require('multer');
const authMiddleware = require('./middlewares/authMiddleware');

const app = express();
app.use(cors());
app.use(express.json());

// Upload em memória
app.use((req, res, next) => {
  req.multer = multer({ storage: multer.memoryStorage() });
  next();
});

// Rotas
app.use('/auth', require('./routes/authRoutes'));
app.use('/tracks', require('./routes/trackRoutes'));
app.use('/upload', require('./routes/uploadRoutes'));
app.use('/playlists', require('./routes/playlistRoutes'));

module.exports = app;
