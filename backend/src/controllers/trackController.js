const pool = require('../config/db');
const s3 = require('../config/s3');

exports.getTracks = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.id, t.title, t.duration, t.file_url, a.name as artist, al.title as album
      FROM tracks t
      LEFT JOIN albums al ON t.album_id = al.id
      LEFT JOIN artists a ON al.artist_id = a.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar faixas.');
  }
};

exports.streamTrack = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT file_url FROM tracks WHERE id = $1', [id]);
    const track = result.rows[0];
    if (!track) return res.status(404).send('Faixa não encontrada.');

    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: process.env.S3_BUCKET,
      Key: track.file_url,
      Expires: 300,
    });
    res.json({ url: signedUrl });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao gerar URL de stream.');
  }
};
