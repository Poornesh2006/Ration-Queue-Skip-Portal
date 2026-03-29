const ORDER_KEY = "smart-queue-order";
const HISTORY_KEY = "smart-queue-purchases";

export const orderStorage = {
  getOrder() {
    const stored = localStorage.getItem(ORDER_KEY);
    return stored ? JSON.parse(stored) : null;
  },
  setOrder(order) {
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  },
  clearOrder() {
    localStorage.removeItem(ORDER_KEY);
  },
  getHistory() {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  },
  addHistory(entry) {
    const history = this.getHistory();
    history.unshift(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  },
};
