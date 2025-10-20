require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const aws = require('aws-sdk');
const multer = require('multer');
const cors = require('cors');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');     // ADICIONADO (Fase 2)
const jwt = require('jsonwebtoken'); // ADICIONADO (Fase 2)

// Importa nosso middleware de autenticação
const authMiddleware = require('./authMiddleware'); // ADICIONADO (Fase 2)

const app = express();
const port = 3001;

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- Configuração do Banco de Dados (PostgreSQL) ---
// (Usando a string de conexão para evitar problemas com SCRAM)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`
});

// --- Configuração do Storage (MinIO) ---
const s3 = new aws.S3({
  endpoint: process.env.S3_ENDPOINT,
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
});

// --- Configuração do Upload (Multer) ---
const upload = multer({ storage: multer.memoryStorage() });

// ===========================================
// ROTAS PÚBLICAS (FASE 1)
// ===========================================

// GET /tracks → lista faixas (qualquer um pode ver)
app.get('/tracks', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.title, t.duration, t.file_url, a.name as artist, al.title as album
       FROM tracks t
       LEFT JOIN albums al ON t.album_id = al.id
       LEFT JOIN artists a ON al.artist_id = a.id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar faixas.');
  }
});

// GET /stream/:id → retorna uma URL para tocar (qualquer um pode ouvir)
app.get('/stream/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT file_url FROM tracks WHERE id = $1', [id]);
    const track = result.rows[0];

    if (!track) {
      return res.status(404).send('Faixa não encontrada.');
    }

    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: process.env.S3_BUCKET,
      Key: track.file_url,
      Expires: 60 * 5, // 5 minutos
    });

    res.json({ url: signedUrl });

  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao gerar URL de stream.');
  }
});

// ===========================================
// ROTAS DE AUTENTICAÇÃO (FASE 2)
// ===========================================
//
// ESTE BLOCO INTEIRO ESTAVA FALTANDO NO SEU ARQUIVO!
//
// ===========================================

// POST /auth/register -> Cadastrar novo usuário
app.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !password || !name) {
    return res.status(400).send('Nome, email e senha são obrigatórios.');
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, password_hash]
    );

    res.status(201).json(newUser.rows[0]);

  } catch (err) {
    if (err.code === '23505') { // Email duplicado
      return res.status(400).send('Este email já está cadastrado.');
    }
    console.error(err);
    res.status(500).send('Erro no servidor.');
  }
});

// POST /auth/login -> Logar usuário
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];
    if (!user) return res.status(401).send('Credenciais inválidas.');

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).send('Credenciais inválidas.');

    const payload = { user: { id: user.id, email: user.email } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Erro no servidor.');
  }
});


// ===========================================
// ROTAS PROTEGIDAS (FASE 1 e 2)
// ===========================================
// (Tudo abaixo daqui exige login)
// ===========================================

// POST /upload → envia um arquivo MP3
app.post('/upload', authMiddleware, upload.single('track'), async (req, res) => {
  const { title, artistName, albumTitle } = req.body;
  const file = req.file;
  if (!file) return res.status(400).send('Nenhum arquivo enviado.');

  const fileKey = `${crypto.randomBytes(16).toString('hex')}-${file.originalname}`;
  const uploadParams = {
    Bucket: process.env.S3_BUCKET,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    await s3.upload(uploadParams).promise();

    // --- Lógica do banco ---
    let artistRes = await pool.query('SELECT id FROM artists WHERE name = $1', [artistName]);
    let artistId = artistRes.rows[0]?.id;
    if (!artistId) {
      artistRes = await pool.query('INSERT INTO artists(name) VALUES($1) RETURNING id', [artistName]);
      artistId = artistRes.rows[0].id;
    }

    let albumRes = await pool.query('SELECT id FROM albums WHERE title = $1 AND artist_id = $2', [albumTitle, artistId]);
    let albumId = albumRes.rows[0]?.id;
    if (!albumId) {
      albumRes = await pool.query('INSERT INTO albums(title, artist_id) VALUES($1, $2) RETURNING id', [albumTitle, artistId]);
      albumId = albumRes.rows[0].id;
    }

    const newTrack = await pool.query(
      'INSERT INTO tracks(title, album_id, duration, file_url) VALUES($1, $2, $3, $4) RETURNING *',
      [title, albumId, 0, fileKey]
    );

    res.status(201).json(newTrack.rows[0]);
  } catch (err) {
    console.error('Erro no upload:', err);
    res.status(500).send('Erro ao processar upload.');
  }
});

// POST /playlists -> Criar uma nova playlist
app.post('/playlists', authMiddleware, async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;

  try {
    const newPlaylist = await pool.query(
      'INSERT INTO playlists (user_id, name) VALUES ($1, $2) RETURNING *',
      [userId, name]
    );
    res.status(201).json(newPlaylist.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro no servidor.');
  }
});

// GET /playlists/me -> Listar MINHAS playlists
app.get('/playlists/me', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const playlists = await pool.query(
      'SELECT * FROM playlists WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(playlists.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro no servidor.');
  }
});

// POST /playlists/:id/tracks -> Adicionar música a uma playlist
app.post('/playlists/:id/tracks', authMiddleware, async (req, res) => {
  const { track_id } = req.body;
  const playlist_id = req.params.id;

  try {
    const newEntry = await pool.query(
      'INSERT INTO playlist_tracks (playlist_id, track_id) VALUES ($1, $2) RETURNING *',
      [playlist_id, track_id]
    );
    res.status(201).json(newEntry.rows[0]);
  } catch (err)
 {
    if (err.code === '23505') {
      return res.status(400).send('Música já está na playlist.');
    }
    console.error(err);
    res.status(500).send('Erro no servidor.');
  }
});

// --- Inicialização ---
app.listen(port, async () => {
  console.log(`🚀 Backend rodando em http://localhost:${port}`);
  try {
    await pool.query('SELECT NOW()');
    console.log('PostgreSQL conectado com sucesso!');
  } catch (err) {
    console.error('Falha ao conectar no PostgreSQL:', err.message);
  }
});