import React, { useContext } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';

function App() {
  const { token, logout } = useContext(AuthContext);

  return (
    <>
      <nav>
        <Link to="/">Home</Link>
        {token ? (
          <button onClick={logout}>Logout</button>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Cadastro</Link>
          </>
        )}
      </nav>

      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/register" element={token ? <Navigate to="/" /> : <RegisterPage />} />
        <Route path="/" element={token ? <HomePage /> : <Navigate to="/login" />} />
      </Routes>
    </>
  );
}

export default App;
