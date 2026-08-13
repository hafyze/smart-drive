import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/features/auth/hooks/useAuth";

export default function ProtectedRoute() {
    const { isAuthenticated, isInitialized } = useAuth();
    const location = useLocation();

    if (!isInitialized) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
                    Loading...
                </div>
            </div>
        );
    }
    if (!isAuthenticated) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location }}
            />
        );
    }

    return <Outlet />;
}