const pool = require('../config/db');

exports.createPlaylist = async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;

  try {
    const playlist = await pool.query(
      'INSERT INTO playlists (user_id, name) VALUES ($1, $2) RETURNING *',
      [userId, name]
    );
    res.status(201).json(playlist.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro no servidor.');
  }
};

exports.getMyPlaylists = async (req, res) => {
  const userId = req.user.id;
  try {
    const playlists = await pool.query('SELECT * FROM playlists WHERE user_id = $1', [userId]);
    res.json(playlists.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro no servidor.');
  }
};

exports.addTrackToPlaylist = async (req, res) => {
  const { track_id } = req.body;
  const playlistId = req.params.id;

  try {
    const result = await pool.query(
      'INSERT INTO playlist_tracks (playlist_id, track_id) VALUES ($1, $2) RETURNING *',
      [playlistId, track_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).send('Música já está na playlist.');
    console.error(err);
    res.status(500).send('Erro no servidor.');
  }
};
