import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://stocktrace-ywsjv055.b4a.run/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("stocktrace_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
