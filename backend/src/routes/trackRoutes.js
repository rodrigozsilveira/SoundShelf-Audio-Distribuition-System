const express = require('express');
const router = express.Router();
const trackController = require('../controllers/trackController');

// Listar todas as faixas (público)
router.get('/', trackController.getTracks);

// Gerar URL temporária para streaming (público)
router.get('/stream/:id', trackController.streamTrack);

module.exports = router;
