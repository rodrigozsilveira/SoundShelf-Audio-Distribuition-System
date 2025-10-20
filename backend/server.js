require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const aws = require('aws-sdk');
const multer = require('multer');
const cors = require('cors');
const crypto = require('crypto'); // Para gerar nomes de arquivos únicos

const app = express();
const port = 3001; // Porta do backend

// --- Middlewares ---
app.use(cors()); // Permite acesso do frontend
app.use(express.json());

// --- Configuração do Banco de Dados (PostgreSQL) ---
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// --- Configuração do Storage (MinIO) ---
const s3 = new aws.S3({
  endpoint: process.env.S3_ENDPOINT,
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  s3ForcePathStyle: true, // Essencial para MinIO
  signatureVersion: 'v4',
});

// --- Configuração do Upload (Multer) ---
// Usamos armazenamento em memória para depois enviar ao S3
const upload = multer({ storage: multer.memoryStorage() });

// --- Rotas da API ---

// GET /tracks → lista faixas
app.get('/tracks', async (req, res) => {
  try {
    // Para o MVP, vamos juntar tudo. Idealmente, você faria JOINs.
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

// POST /upload → envia um arquivo MP3
// Simplificação do MVP: enviamos o áudio e os metadados juntos.
// Em um app real, você primeiro criaria o artista/album e depois faria upload da faixa.
app.post('/upload', upload.single('track'), async (req, res) => {
  const { title, artistName, albumTitle } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).send('Nenhum arquivo enviado.');
  }

  // 1. Gerar um nome de arquivo único
  const fileKey = `${crypto.randomBytes(16).toString('hex')}-${file.originalname}`;

  // 2. Parâmetros de Upload para o S3
  const uploadParams = {
    Bucket: process.env.S3_BUCKET,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    // 3. Fazer o upload para o MinIO/S3
    await s3.upload(uploadParams).promise();
    
    // 4. Salvar metadados no Postgres (com lógica simplificada)
    // Encontrar ou criar artista
    let artistRes = await pool.query('SELECT id FROM artists WHERE name = $1', [artistName]);
    let artistId = artistRes.rows[0]?.id;
    if (!artistId) {
      artistRes = await pool.query('INSERT INTO artists(name) VALUES($1) RETURNING id', [artistName]);
      artistId = artistRes.rows[0].id;
    }

    // Encontrar ou criar álbum
    let albumRes = await pool.query('SELECT id FROM albums WHERE title = $1 AND artist_id = $2', [albumTitle, artistId]);
    let albumId = albumRes.rows[0]?.id;
    if (!albumId) {
      albumRes = await pool.query('INSERT INTO albums(title, artist_id) VALUES($1, $2) RETURNING id', [albumTitle, artistId]);
      albumId = albumRes.rows[0].id;
    }
    
    // 5. Inserir a faixa (track)
    // OBS: 'duration' está como 0, você precisaria de uma lib (ex: music-metadata) para ler a duração do MP3
    const newTrack = await pool.query(
      'INSERT INTO tracks(title, album_id, duration, file_url) VALUES($1, $2, $3, $4) RETURNING *',
      [title, albumId, 0, fileKey] // file_url é SÓ a chave (key) do S3
    );

    res.status(201).json(newTrack.rows[0]);

  } catch (err) {
    console.error('Erro no upload:', err);
    res.status(500).send('Erro ao processar upload.');
  }
});


// GET /stream/:id → retorna uma URL para tocar a música
app.get('/stream/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT file_url FROM tracks WHERE id = $1', [id]);
    const track = result.rows[0];

    if (!track) {
      return res.status(404).send('Faixa não encontrada.');
    }

    // 1. Pegar a Chave (file_url) do banco
    const fileKey = track.file_url;

    // 2. Gerar a URL Pré-Assinada (Signed URL)
    const urlParams = {
      Bucket: process.env.S3_BUCKET,
      Key: fileKey,
      Expires: 60 * 5, // URL expira em 5 minutos
    };

    const signedUrl = s3.getSignedUrl('getObject', urlParams);

    // 3. Retornar a URL para o cliente
    res.json({ url: signedUrl });
    
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao gerar URL de stream.');
  }
});


// --- Inicialização do Servidor ---
app.listen(port, async () => {
  console.log(`🚀 Backend rodando em http://localhost:${port}`);
  
  // Tenta conectar ao DB
  try {
    await pool.query('SELECT NOW()');
    console.log('PostgreSQL conectado com sucesso!');
    // Aqui você pode rodar a criação das tabelas
  } catch (err) {
    console.error('Falha ao conectar no PostgreSQL:', err.message);
  }
});