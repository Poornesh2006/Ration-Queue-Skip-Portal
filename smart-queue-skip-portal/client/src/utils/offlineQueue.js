const OFFLINE_QUEUE_KEY = "smart-queue-offline-actions";

export const offlineQueue = {
  getAll() {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  },
  add(action) {
    const actions = this.getAll();
    actions.push({
      ...action,
      queuedAt: new Date().toISOString(),
    });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(actions));
  },
  clear() {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  },
};
