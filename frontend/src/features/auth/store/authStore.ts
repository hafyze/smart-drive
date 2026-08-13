import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { User } from "../types/auth"

interface AuthState {
    user: User | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isInitialized: boolean;

    setAuth: (user: User, accessToken: string) => void;
    setInitialized: (value: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isInitialized: false,

            setAuth: (user, accessToken) =>
                set({
                    user,
                    accessToken,
                    isAuthenticated: true,
                }),

            setInitialized: (value) => 
                set({
                    isInitialized: value,
                }),

            logout: () =>
                set({
                    user: null,
                    accessToken: null,
                    isAuthenticated: false,
                }),
        }),
        {
            name: "smart-drive-auth",
        }
    )
);