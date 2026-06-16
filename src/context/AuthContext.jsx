
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService';
import { api, onSessionExpired } from '../services/api';
import { retryPricing } from '../utils/helpers';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          storageService.getToken(),
          storageService.getUser(),
        ]);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(savedUser);
          const fresh = await api.getMe();
          setUser(fresh);
          await storageService.saveUser(fresh);
          retryPricing();
        }
      } catch {
        await storageService.clear();
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const signIn = async ({ idToken, serverAuthCode, accessToken }) => {
    try {
      const res = await api.googleSignIn({ idToken, serverAuthCode, accessToken });
      await storageService.saveToken(res.token);
      await storageService.saveUser(res.user);
      setToken(res.token);
      setUser(res.user);
      retryPricing();
    } catch (err) {
      await storageService.clear().catch(() => {});
      setToken(null);
      setUser(null);
      throw err;
    }
  };

  const signOut = async () => {
    await storageService.clear();
    setToken(null);
    setUser(null);
  };

  // Listen for 401 session expiry from api.js — clear auth state silently
  useEffect(() => {
    const unsub = onSessionExpired(() => {
      setToken(null);
      setUser(null);
    });
    return unsub;
  }, []);

  const refreshUser = async () => {
    const fresh = await api.getMe();
    setUser(fresh);
    await storageService.saveUser(fresh);
    return fresh;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
