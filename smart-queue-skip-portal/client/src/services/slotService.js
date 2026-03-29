import apiClient from "./apiClient";

export const slotService = {
  getSlots: async (date) => {
    const endpoint = date ? `/slots?date=${date}` : "/slots";
    const { data } = await apiClient.get(endpoint);
    return data;
  },
};
