import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios'; // <-- Precisa disso

// Precisa disso
const API_URL = 'http://localhost:3001'; 

export const AuthContext = createContext();

// Função "Helper" para mandar o token em todas as requisições
const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

export const AuthProvider = ({ children }) => {
  
  const storedToken = localStorage.getItem('token');
  const initialToken = (storedToken && storedToken !== 'null') ? storedToken : null;

  const [token, setToken] = useState(initialToken);
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      setAuthToken(token);
    } else {
      localStorage.removeItem('token');
      setAuthToken(null);
    }
    setLoading(false);
  }, [token]);

  // Função de LOGIN
  const login = async (email, password) => {
    const res = await axios.post(`${API_URL}/auth/login`, { email, password }); // <-- Com /auth/
    setToken(res.data.token);
    setUser(res.data.user);
  };

  // Função de REGISTER
  const register = async (name, email, password) => {
    // ESTA É A LINHA QUE CAUSA O SEU ERRO 404
    // TEM QUE TER O '/auth/'
    await axios.post(`${API_URL}/auth/register`, { name, email, password }); 
  };

  // Função de LOGOUT
  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider 
      value={{ 
        token, 
        user, 
        loading, 
        login, 
        register, // <-- Precisa exportar a função
        logout 
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};