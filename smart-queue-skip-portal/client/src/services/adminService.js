import apiClient from "./apiClient";

export const adminService = {
  adminLogin: async (payload) => {
    const { data } = await apiClient.post("/admin/login", payload);
    return data;
  },
  getOverview: async () => {
    const { data } = await apiClient.get("/admin/overview");
    return data;
  },
  getAnalytics: async () => {
    const { data } = await apiClient.get("/admin/analytics");
    return data;
  },
  getHistory: async (params = {}) => {
    const { data } = await apiClient.get("/admin/history", { params });
    return data;
  },
  downloadReport: async (params = {}) => {
    const response = await apiClient.get("/admin/report", {
      params,
      responseType: "blob",
    });

    return {
      blob: response.data,
      contentType: response.headers["content-type"],
    };
  },
  getProducts: async (params = {}) => {
    const { data } = await apiClient.get("/admin/products", { params });
    return data;
  },
  createProduct: async (payload) => {
    const { data } = await apiClient.post("/admin/products", payload);
    return data;
  },
  updateProduct: async (productId, payload) => {
    const { data } = await apiClient.put(`/admin/products/${productId}`, payload);
    return data;
  },
  deleteProduct: async (productId) => {
    const { data } = await apiClient.delete(`/admin/products/${productId}`);
    return data;
  },
  getUsers: async () => {
    const { data } = await apiClient.get("/admin/users");
    return data;
  },
  toggleUserBlock: async (userId) => {
    const { data } = await apiClient.patch(`/admin/users/${userId}/block`);
    return data;
  },
  verifyUser: async (userId) => {
    const { data } = await apiClient.patch(`/admin/users/${userId}/verify`);
    return data;
  },
  getShops: async () => {
    const { data } = await apiClient.get("/admin/shops");
    return data;
  },
  createShop: async (payload) => {
    const { data } = await apiClient.post("/admin/shops", payload);
    return data;
  },
  updateShop: async (shopId, payload) => {
    const { data } = await apiClient.put(`/admin/shops/${shopId}`, payload);
    return data;
  },
  getFraudInsights: async () => {
    const { data } = await apiClient.get("/fraud");
    return data;
  },
  getFraudCases: async () => {
    const { data } = await apiClient.get("/admin/fraud");
    return data;
  },
  getArchives: async () => {
    const { data } = await apiClient.get("/admin/archives");
    return data;
  },
  getQueueStatus: async () => {
    const { data } = await apiClient.get("/admin/queue");
    return data;
  },
  getAuditLogs: async () => {
    const { data } = await apiClient.get("/admin/audit-logs");
    return data;
  },
  sendNotification: async (payload) => {
    const { data } = await apiClient.post("/admin/notifications", payload);
    return data;
  },
  getGrievances: async () => {
    const { data } = await apiClient.get("/grievances");
    return data;
  },
};
