import { useEffect } from "react";
import { isAxiosError } from "axios";

import { useAuthStore } from "../store/authStore";
import { authApi } from "../api/authApi";
import { useAuth } from "../hooks/useAuth";

export function AuthInitializer() {
    const {
        accessToken,
        rememberMe,
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

                setAuth(user, accessToken, rememberMe);
            } catch (error) {
                if (
                    !isAxiosError(error) ||
                    error.response?.status === 401 ||
                    error.response?.status === 403
                ) {
                    logout();
                }
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
        rememberMe,
        isInitialized,
        setAuth,
        setInitialized,
        logout,
    ]);

    return null;
}
