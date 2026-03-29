import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";
import { storage } from "../utils/storage";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => storage.getAuth());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth) {
      storage.setAuth(auth);
    } else {
      storage.clearAuth();
    }
  }, [auth]);

  const login = async (payload) => {
    setLoading(true);
    try {
      const response = await authService.login(payload);
      setAuth(response);
      return response;
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async (payload) => {
    setLoading(true);
    try {
      return await authService.sendOtp(payload);
    } finally {
      setLoading(false);
    }
  };

  const verifyUser = async (payload) => {
    setLoading(true);
    try {
      return await authService.verifyUser(payload);
    } finally {
      setLoading(false);
    }
  };

  const verifyFace = async (payload) => {
    setLoading(true);
    try {
      return await authService.verifyFace(payload);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (payload) => {
    setLoading(true);
    try {
      const response = await authService.verifyOtp(payload);
      setAuth(response);
      return response;
    } finally {
      setLoading(false);
    }
  };

  const adminLogin = async (payload) => {
    setLoading(true);
    try {
      const response = await authService.adminLogin(payload);
      setAuth(response);
      return response;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const response = await authService.register(payload);
      setAuth(response);
      return response;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (auth?.token) {
        await authService.logout();
      }
    } catch {
      // Local logout should still succeed even if server logging fails.
    } finally {
      setAuth(null);
    }
  };

  const value = useMemo(
    () => ({
      auth,
      user: auth?.user || null,
      token: auth?.token || null,
      loading,
      login,
      verifyUser,
      verifyFace,
      sendOtp,
      verifyOtp,
      adminLogin,
      register,
      logout,
    }),
    [auth, loading, login, verifyUser, verifyFace, sendOtp, verifyOtp, adminLogin, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
