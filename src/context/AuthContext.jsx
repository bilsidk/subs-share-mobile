
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
      } catch (err) {
        // Only a genuine auth rejection should drop the session. A network or
        // timeout error at launch (airplane mode, backend hiccup) must NOT log the
        // user out — keep the cached token/user so the app works offline. A real
        // 401 is also handled by the onSessionExpired listener below.
        if (err?.status === 401 || err?.data?.code === 'YOUTUBE_REAUTH') {
          await storageService.clear();
          setToken(null);
          setUser(null);
        }
        // otherwise: keep the cached session already set above.
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const signIn = async ({ idToken, serverAuthCode, accessToken, referralCode }) => {
    try {
      const res = await api.googleSignIn({ idToken, serverAuthCode, accessToken, referralCode });
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
    // Never let a storage error trap the user in a signed-in state — always clear.
    try { await storageService.clear(); } catch { /* ignore */ }
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
