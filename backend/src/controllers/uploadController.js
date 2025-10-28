const pool = require('../config/db');
const s3 = require('../config/s3');
const crypto = require('crypto');

exports.uploadTrack = async (req, res) => {
  const { title, artistName, albumTitle } = req.body;
  const file = req.file;
  if (!file) return res.status(400).send('Nenhum arquivo enviado.');

  const fileKey = `${crypto.randomBytes(16).toString('hex')}-${file.originalname}`;
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    await s3.upload(params).promise();

    let artist = await pool.query('SELECT id FROM artists WHERE name = $1', [artistName]);
    let artistId = artist.rows[0]?.id;
    if (!artistId) {
      artist = await pool.query('INSERT INTO artists(name) VALUES($1) RETURNING id', [artistName]);
      artistId = artist.rows[0].id;
    }

    let album = await pool.query('SELECT id FROM albums WHERE title = $1 AND artist_id = $2', [albumTitle, artistId]);
    let albumId = album.rows[0]?.id;
    if (!albumId) {
      album = await pool.query('INSERT INTO albums(title, artist_id) VALUES($1, $2) RETURNING id', [albumTitle, artistId]);
      albumId = album.rows[0].id;
    }

    const newTrack = await pool.query(
      'INSERT INTO tracks(title, album_id, duration, file_url) VALUES($1, $2, $3, $4) RETURNING *',
      [title, albumId, 0, fileKey]
    );

    res.status(201).json(newTrack.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao processar upload.');
  }
};
