import React, { useState, useContext } from 'react'; // <-- Precisa do useContext
import { useNavigate } from 'react-router-dom'; // <-- Para redirecionar
import { AuthContext } from '../context/AuthContext'; // <-- Importe o CONTEXTO

function RegisterPage() {
  // 1. Adicionar estado para o 'name'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 2. Pegar a função 'register' do CONTEXTO
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  // 3. Mudar o nome do handler (boa prática)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 4. Chamar a função 'register' do CONTEXTO (que tem a URL correta)
      await register(name, email, password);
      
      alert('Cadastro realizado com sucesso! Por favor, faça o login.');
      navigate('/login'); // Redireciona para o login
    } catch (err) {
      // O 'err.response.data' vem direto do backend (ex: "Email já cadastrado")
      alert('Falha no Cadastro: ' + (err.response?.data || err.message));
      console.error(err);
    }
  };

  return (
    <div className="auth-page">
      <h2>Cadastro</h2>
      {/* 5. Mudar o 'onSubmit' */}
      <form onSubmit={handleSubmit}>
        
        {/* 6. Adicionar o input 'name' */}
        <label>Nome:</label>
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          required 
        />

        <label>Email:</label>
        <input 
          type="email" 
          value={email} // <-- Adicionar value
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        
        <label>Senha:</label>
        <input 
          type="password" 
          value={password} // <-- Adicionar value
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
        <button type="submit">Cadastrar</button>
      </form>
    </div>
  );
}

export default RegisterPage;