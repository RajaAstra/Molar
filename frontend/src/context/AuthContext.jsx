/**
 * AuthContext — global authentication state for MOLAR.
 *
 * Provides: user, token, login(), logout(), loading
 *
 * Token is stored in localStorage under the key "molar_token".
 * User object is stored under "molar_user".
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Start loading only if there's a token to validate
  const [loading, setLoading] = useState(() => !!localStorage.getItem('molar_token'));

  // On mount: if we have a stored token, validate it against the API
  useEffect(() => {
    const token = localStorage.getItem('molar_token');
    if (!token) return; // Nothing to validate; loading already false
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => {
        // Token is invalid/expired — clear it
        localStorage.removeItem('molar_token');
        localStorage.removeItem('molar_user');
      })
      .finally(() => setLoading(false));
  }, []);

  /**
   * Save token + user to state and localStorage.
   * Called after a successful login or register response.
   */
  const login = useCallback((token, userData) => {
    localStorage.setItem('molar_token', token);
    localStorage.setItem('molar_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('molar_token');
    localStorage.removeItem('molar_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
