import { useEffect } from "react";

import { useAuthStore } from "../store/authStore";
import { authApi } from "../api/authApi";
import { useAuth } from "../hooks/useAuth";

export function AuthInitializer() {
    const {
        accessToken,
        isInitialized,
        setAuth,
        setInitialized,
        logout,
    } = useAuth();

    useEffect(() => {
        const initializeAuth = async () => {
            if (isInitialized) {
                return;
            }

            if (!accessToken) {
                setInitialized(true);
                return;
            }

            try {
                const user = await authApi.me();

                setAuth(user, accessToken);
            } catch {
                logout();
            } finally {
                setInitialized(true);
            }
        };

        if (useAuthStore.persist.hasHydrated()) {
            initializeAuth();
            return;
        }

        const unsubscribe =
            useAuthStore.persist.onFinishHydration(() => {
                initializeAuth();
            });

        return unsubscribe;
    }, [
        accessToken,
        isInitialized,
        setAuth,
        setInitialized,
        logout,
    ]);

    return null;
}