import apiClient from "./apiClient";

export const bookingService = {
  createBooking: async (payload) => {
    const { data } = await apiClient.post("/bookings", payload);
    return data;
  },
  getMyBookings: async (params = {}) => {
    const { data } = await apiClient.get("/bookings", { params });
    return data;
  },
  getUserBookingHistory: async () => {
    const { data } = await apiClient.get("/bookings/user");
    return data;
  },
  createManualBooking: async (payload) => {
    const { data } = await apiClient.post("/bookings/manual", payload);
    return data;
  },
  confirmPayment: async (bookingId, payload) => {
    const { data } = await apiClient.post(`/bookings/${bookingId}/payment`, payload);
    return data;
  },
  markDelivered: async (bookingId) => {
    const { data } = await apiClient.patch(`/bookings/${bookingId}/deliver`);
    return data;
  },
  verifyQr: async (payload) => {
    const { data } = await apiClient.post("/bookings/verify-qr", payload);
    return data;
  },
};
