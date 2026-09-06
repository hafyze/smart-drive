import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { ROUTES } from "./routes";

export default function PublicOnlyRoute() {
    const { isAuthenticated, isInitialized } = useAuth();

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

    if (isAuthenticated) {
        return (
            <Navigate
                to={ROUTES.DASHBOARD}
                replace
            />
        );
    }

    return <Outlet />;
}
