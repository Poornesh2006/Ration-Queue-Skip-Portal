const STORAGE_KEY = "smart-queue-device-id";

const getStoredDeviceId = () => localStorage.getItem(STORAGE_KEY);

const setStoredDeviceId = (value) => localStorage.setItem(STORAGE_KEY, value);

export const getDeviceInfo = () => {
  let deviceId = getStoredDeviceId();

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    setStoredDeviceId(deviceId);
  }

  return {
    device_id: deviceId,
    device_name: navigator.userAgent,
  };
};

export const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
