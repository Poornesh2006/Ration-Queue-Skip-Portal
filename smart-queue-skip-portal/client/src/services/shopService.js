import apiClient from "./apiClient";

export const shopService = {
  getShops: async () => {
    const { data } = await apiClient.get("/shops");
    return data;
  },
};
