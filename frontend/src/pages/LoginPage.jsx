import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Importe o Link
import { AuthContext } from '../context/AuthContext'; // Importe o Contexto

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Pega a função 'login' do Contexto
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Chama a função 'login' do Contexto
      // Ela já sabe a URL correta (/auth/login)
      await login(email, password);

      // Se o login funcionar, o 'token' no App.jsx vai mudar
      // e o <Route> vai nos levar para a Home.
      // Mas podemos forçar um redirecionamento para garantir:
      navigate('/'); 
    } catch (err) {
      // O 'err.response.data' vem direto do backend (ex: "Credenciais inválidas.")
      alert('Falha no Login: ' + (err.response?.data || err.message));
      console.error(err);
    }
  };

  return (
    <div className="auth-page">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <label>Email:</label>
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        
        <label>Senha:</label>
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
        <button type="submit">Entrar</button>
      </form>

      {/* Link útil para a página de cadastro */}
      <p style={{ marginTop: '1rem', textAlign: 'center' }}>
        Não tem uma conta? <Link to="/register">Cadastre-se</Link>
      </p>
    </div>
  );
}

export default LoginPage;