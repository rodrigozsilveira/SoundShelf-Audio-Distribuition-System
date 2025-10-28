const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');

// Armazena arquivo na memória antes do upload para o S3
const upload = multer({ storage: multer.memoryStorage() });

// Upload de música (protegido)
router.post('/', authMiddleware, upload.single('track'), uploadController.uploadTrack);

module.exports = router;
