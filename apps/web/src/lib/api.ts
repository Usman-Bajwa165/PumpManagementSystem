import axios from "axios";

const api = axios.create({
  // Next (web) runs on 3000; Nest API runs on 3001 by default in dev.
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
});

// Add a request interceptor to add the active token
api.interceptors.request.use(
  (config: any) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => Promise.reject(error),
);

// Add a response interceptor to handle 401s
api.interceptors.response.use(
  (response: any) => response,
  (error: any) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
