import { create } from "zustand";
import {
    createJSONStorage,
    persist,
    type StateStorage,
} from "zustand/middleware";

import type { User } from "../types/auth";

interface AuthState {
    user: User | null;
    accessToken: string | null;
    rememberMe: boolean;
    isAuthenticated: boolean;
    isInitialized: boolean;

    setAuth: (
        user: User,
        accessToken: string,
        rememberMe?: boolean,
    ) => void;
    setInitialized: (value: boolean) => void;
    logout: () => void;
}

const authStorage: StateStorage = {
    getItem: (name) => {
        return (
            localStorage.getItem(name) ??
            sessionStorage.getItem(name)
        );
    },
    setItem: (name, value) => {
        let parsed: {
            state?: Partial<AuthState>;
        };

        try {
            parsed = JSON.parse(value) as {
                state?: Partial<AuthState>;
            };
        } catch {
            localStorage.removeItem(name);
            sessionStorage.removeItem(name);
            return;
        }

        if (!parsed.state?.accessToken) {
            localStorage.removeItem(name);
            sessionStorage.removeItem(name);
            return;
        }

        if (parsed.state.rememberMe) {
            localStorage.setItem(name, value);
            sessionStorage.removeItem(name);
            return;
        }

        sessionStorage.setItem(name, value);
        localStorage.removeItem(name);
    },
    removeItem: (name) => {
        localStorage.removeItem(name);
        sessionStorage.removeItem(name);
    },
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            rememberMe: false,
            isAuthenticated: false,
            isInitialized: false,

            setAuth: (
                user,
                accessToken,
                rememberMe = false,
            ) =>
                set({
                    user,
                    accessToken,
                    rememberMe,
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
                    rememberMe: false,
                    isAuthenticated: false,
                }),
        }),
        {
            name: "smart-drive-auth",
            version: 1,
            storage: createJSONStorage(() => authStorage),
            migrate: (persistedState) => ({
                ...(persistedState as Partial<AuthState>),
                isInitialized: false,
            }),
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                rememberMe: state.rememberMe,
                isAuthenticated: state.isAuthenticated,
            }),
        },
    ),
);
