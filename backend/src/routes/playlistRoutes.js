const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const authMiddleware = require('../middlewares/authMiddleware');

// Criar playlist (protegido)
router.post('/', authMiddleware, playlistController.createPlaylist);

// Listar playlists do usuário logado (protegido)
router.get('/me', authMiddleware, playlistController.getMyPlaylists);

// Adicionar música a uma playlist (protegido)
router.post('/:id/tracks', authMiddleware, playlistController.addTrackToPlaylist);

module.exports = router;
