import api from "@/shared/api/axios";

import type {
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    User,
} from "../types/auth";

console.log("VITE_API_URL =", import.meta.env.VITE_API_URL);

export const authApi = {
    register: async (request: RegisterRequest): Promise<TokenResponse> => {
        const response = await api.post<TokenResponse>(
            "/auth/register",
            request
        );
        return response.data
    },

    login: async (request: LoginRequest): Promise<TokenResponse> => {
        const response = await api.post<TokenResponse>(
            "/auth/login",
            request
        );
        return response.data
    },

    me: async (): Promise<User> => {
        const response = await api.get<User>("/auth/me");

        return response.data
    }
}