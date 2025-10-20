import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import ReactPlayer from 'react-player';
import { AuthContext } from '../context/AuthContext'; // Importe o Contexto

// A URL da API (o Contexto também a usa, mas é bom tê-la aqui)
const API_URL = 'http://localhost:3001';

function HomePage() {
  // Pega o 'user' e o 'token' do contexto
  // O 'token' não é usado diretamente, mas garante que a página só renderize logada
  const { user } = useContext(AuthContext);

  // Todo o estado da sua FASE 1
  const [tracks, setTracks] = useState([]);
  const [currentTrackUrl, setCurrentTrackUrl] = useState(null);
  
  // Estados para o formulário de Upload
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');

  // --- Funções da FASE 1 ---

  // 1. Função para carregar as faixas
  const fetchTracks = async () => {
    try {
      // Rota pública, não precisa de token (mas poderia)
      const response = await axios.get(`${API_URL}/tracks`);
      setTracks(response.data);
    } catch (error) {
      console.error('Erro ao buscar faixas:', error);
    }
  };

  // 2. Carrega as faixas quando o componente monta
  useEffect(() => {
    fetchTracks();
  }, []);

  // 3. Função para "tocar" uma música
  const handlePlay = async (trackId) => {
    try {
      // Pede ao backend a URL segura (signed URL)
      const response = await axios.get(`${API_URL}/stream/${trackId}`);
      setCurrentTrackUrl(response.data.url);
    } catch (error) {
      console.error('Erro ao obter URL de stream:', error);
    }
  };

  // 4. Função de Upload
  const handleUpload = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('track', file);
    formData.append('title', title);
    formData.append('artistName', artist);
    formData.append('albumTitle', album);

    try {
      // IMPORTANTE: Esta rota (/upload) é PROTEGIDA.
      // O 'AuthContext' já configurou o axios para enviar
      // o token em TODOS os cabeçalhos.
      // Você não precisa fazer nada a mais aqui!
      await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      alert('Upload com sucesso!');
      fetchTracks(); // Recarrega as faixas
      // Limpa os campos do formulário (opcional)
      e.target.reset();
      setFile(null);
      setTitle('');
      setArtist('');
      setAlbum('');
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Falha no upload.');
    }
  };

  // --- Renderização (Visual) ---
  return (
    <div className="HomePage">
      {/* Saudação ao usuário logado */}
      <h2>Bem-vindo, {user?.name || 'usuário'}!</h2>

      {/* Seção de Upload (mesma da FASE 1) */}
      <section className="upload-section" style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
        <h3>Upload de Nova Faixa</h3>
        <form onSubmit={handleUpload}>
          <div>
            <label>Arquivo (MP3): </label>
            <input type="file" accept="audio/mpeg" onChange={(e) => setFile(e.target.files[0])} required />
          </div>
          <div>
            <label>Título: </label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label>Artista: </label>
            <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} required />
          </div>
          <div>
            <label>Álbum: </label>
            <input type="text" value={album} onChange={(e) => setAlbum(e.target.value)} required />
          </div>
          <button type="submit">Enviar</button>
        </form>
      </section>

      {/* Seção do Player (mesma da FASE 1) */}
      <section className="player-section">
        {currentTrackUrl ? (
          <ReactPlayer
            url={currentTrackUrl}
            controls={true}
            playing={true}
            width="100%"
            height="50px"
          />
        ) : (
          <div className="player-placeholder">Selecione uma música para tocar</div>
        )}
      </section>

      {/* Seção da Lista de Músicas (mesma da FASE 1) */}
      <section className="track-list-section">
        <h3>Biblioteca</h3>
        <ul className="track-list">
          {tracks.length === 0 && <p>Nenhuma música encontrada.</p>}
          {tracks.map((track) => (
            <li key={track.id} className="track-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #eee' }}>
              <div>
                <strong>{track.title}</strong>
                <small>{track.artist} - {track.album}</small>
              </div>
              <button onClick={() => handlePlay(track.id)}>Tocar</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default HomePage;