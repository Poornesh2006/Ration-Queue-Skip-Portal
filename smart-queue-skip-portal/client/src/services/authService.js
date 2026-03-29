import apiClient from "./apiClient";

export const authService = {
  login: async (payload) => {
    const { data } = await apiClient.post("/auth/login", payload);
    return data;
  },
  verifyUser: async (payload) => {
    const { data } = await apiClient.post("/auth/verify-user", payload);
    return data;
  },
  verifyFace: async (payload) => {
    const { data } = await apiClient.post("/auth/verify-face", payload);
    return data;
  },
  sendOtp: async (payload) => {
    const { data } = await apiClient.post("/auth/send-otp", payload);
    return data;
  },
  verifyOtp: async (payload) => {
    const { data } = await apiClient.post("/auth/verify-otp", payload);
    return data;
  },
  adminLogin: async (payload) => {
    const { data } = await apiClient.post("/admin/login", payload);
    return data;
  },
  register: async (payload) => {
    const { data } = await apiClient.post("/auth/register", payload);
    return data;
  },
  getCurrentUser: async () => {
    const { data } = await apiClient.get("/users/me");
    return data;
  },
  logout: async () => {
    const { data } = await apiClient.post("/auth/logout");
    return data;
  },
};
