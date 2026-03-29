import apiClient from "./apiClient";

export const grievanceService = {
  create: async (payload) => {
    const { data } = await apiClient.post("/grievances", payload);
    return data;
  },
};
