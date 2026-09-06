import { useAuthStore } from "../store/authStore";

export function useAuth() {
    const user =  useAuthStore((state) => state.user);
    const accessToken = useAuthStore((state) => state.accessToken);
    const isAuthenticated = useAuthStore(
        (state) => state.isAuthenticated
    );
    const rememberMe = useAuthStore((state) => state.rememberMe);
    const isInitialized = useAuthStore(
        (state) => state.isInitialized
    )

    const setAuth = useAuthStore((state) => state.setAuth);
    const setInitialized = useAuthStore((state) => state.setInitialized)
    const logout = useAuthStore((state) => state.logout);

    return {
        user,
        accessToken,
        rememberMe,
        isAuthenticated,
        isInitialized,
        setAuth,
        setInitialized,
        logout,
    };
}
