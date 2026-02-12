import { state } from "../state.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

console.log("API Utils loaded, base URL:", apiBaseUrl);

export const apiFetch = async (path, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }
  const url = `${apiBaseUrl}${path}`;
  console.log("API Request:", options.method || "GET", url);
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    console.error("API Error:", response.status, data);
    throw new Error(data.message || "Request failed");
  }
  
  console.log("API Response:", path, data);
  return data;
};
