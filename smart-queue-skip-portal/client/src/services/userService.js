import apiClient from "./apiClient";

export const userService = {
  getMyHistory: async (params = {}) => {
    const { data } = await apiClient.get("/users/history", { params });
    return data;
  },
};
