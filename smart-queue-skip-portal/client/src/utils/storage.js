const AUTH_STORAGE_KEY = "smart-queue-auth";

export const storage = {
  getAuth() {
    if (typeof window === "undefined") {
      return null;
    }

    const stored = localStorage.getItem(AUTH_STORAGE_KEY);

    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  },
  setAuth(auth) {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  },
  clearAuth() {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.removeItem(AUTH_STORAGE_KEY);
  },
};
