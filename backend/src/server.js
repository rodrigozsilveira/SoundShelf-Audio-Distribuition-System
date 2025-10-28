require('dotenv').config();

const app = require('./app');
const pool = require('./config/db');

const port = process.env.PORT || 3001;

app.listen(port, async () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  try {
    await pool.query('SELECT NOW()');
    console.log('PostgreSQL conectado');
  } catch (err) {
    console.error('Erro ao conectar no banco:', err.message);
  }
});
