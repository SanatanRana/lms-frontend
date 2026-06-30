/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial authentication state from localStorage
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const userId = localStorage.getItem('userId');
    const name = localStorage.getItem('userName');
    const email = localStorage.getItem('userEmail');

    if (token && role) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser({ token, role, name: name || '', email: email || '', userId: userId ? parseInt(userId) : null });

      // Fallback for existing active sessions that don't have userId stored
      if (!userId) {
        api.get('/auth/me').then(res => {
          if (res.data?.success) {
            const data = res.data.data;
            localStorage.setItem('userId', data.id.toString());
            setUser(prev => prev ? { ...prev, userId: data.id } : null);
          }
        }).catch(err => console.error("[AuthContext] Failed to fetch user profile:", err));
      }
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('role', userData.role);
    if (userData.userId) {
      localStorage.setItem('userId', userData.userId.toString());
    }
    if (userData.name) {
      localStorage.setItem('userName', userData.name);
    }
    if (userData.email) {
      localStorage.setItem('userEmail', userData.email);
    }
    setUser({
      token: userData.token,
      role: userData.role,
      userId: userData.userId || null,
      name: userData.name || '',
      email: userData.email || ''
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
