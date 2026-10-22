import axios from "axios";

const rawBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const resolvedBaseUrl = rawBaseUrl.replace(/\/+$/, "");
const normalizedBaseUrl = resolvedBaseUrl.endsWith("/api")
  ? resolvedBaseUrl
  : `${resolvedBaseUrl}/api`;

const api = axios.create({
  baseURL: normalizedBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;