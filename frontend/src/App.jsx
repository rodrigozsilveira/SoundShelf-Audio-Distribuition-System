import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactPlayer from 'react-player';
import './App.css'; // Vamos precisar de um CSS mínimo

// URL da nossa API
const API_URL = 'http://localhost:3001';

function App() {
  const [tracks, setTracks] = useState([]);
  const [currentTrackUrl, setCurrentTrackUrl] = useState(null);
  
  // --- Estados para o formulário de Upload ---
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');

  // 1. Função para carregar as faixas
  const fetchTracks = async () => {
    try {
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
    formData.append('track', file); // O arquivo de áudio
    formData.append('title', title);
    formData.append('artistName', artist);
    formData.append('albumTitle', album);

    try {
      await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      // Limpa o formulário e atualiza a lista
      alert('Upload com sucesso!');
      fetchTracks(); // Recarrega as faixas
      setFile(null);
      setTitle('');
      setArtist('');
      setAlbum('');
      e.target.reset(); // Limpa o input de arquivo
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Falha no upload.');
    }
  };

  return (
    <div className="App">
      <h1>Music MVP 🚀</h1>

      {/* Seção de Upload */}
      <section className="upload-section">
        <h2>Upload de Nova Faixa</h2>
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

      {/* Seção do Player */}
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

      {/* Seção da Lista de Músicas */}
      <section className="track-list-section">
        <h2>Biblioteca</h2>
        <ul className="track-list">
          {tracks.length === 0 && <p>Nenhuma música encontrada.</p>}
          {tracks.map((track) => (
            <li key={track.id} className="track-item">
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

export default App;