import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, clearToken, getToken, apiError } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [error, setError] = useState('');

  const loadMe = useCallback(async () => {
    if (!getToken()) { setUser(null); return; }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      clearToken();
      setUser(null);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  const login = async (email, password) => {
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setToken(data.token); setUser(data.user); return true;
    } catch (e) { setError(apiError(e)); return false; }
  };

  const register = async (email, password, name) => {
    setError('');
    try {
      const { data } = await api.post('/auth/register', { email, password, name });
      setToken(data.token); setUser(data.user); return true;
    } catch (e) { setError(apiError(e)); return false; }
  };

  const logout = () => { clearToken(); setUser(null); };

  return (
    <AuthContext.Provider value={{ user, error, login, register, logout, setError }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
