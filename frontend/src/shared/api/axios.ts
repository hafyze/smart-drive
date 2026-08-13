import axios from "axios"

import { useAuthStore } from "@/features/auth/store/authStore";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 15_000,
});

api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().accessToken;

        if(token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

export default api;