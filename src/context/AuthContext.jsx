import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial authentication state from localStorage
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const name = localStorage.getItem('userName');
    const email = localStorage.getItem('userEmail');

    if (token && role) {
      setUser({ token, role, name: name || '', email: email || '' });
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('role', userData.role);
    if (userData.name) {
      localStorage.setItem('userName', userData.name);
    }
    if (userData.email) {
      localStorage.setItem('userEmail', userData.email);
    }
    setUser({
      token: userData.token,
      role: userData.role,
      name: userData.name || '',
      email: userData.email || ''
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
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
