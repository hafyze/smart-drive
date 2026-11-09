import { Link } from "react-router-dom";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { ROUTES } from "./routes";

export default function NotFoundPage() {
    const { isAuthenticated } = useAuth();
    const destination = isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN;
    const destinationLabel = isAuthenticated ? "Return to dashboard" : "Go to sign in";

    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
            <div className="max-w-md space-y-3">
                <p className="text-sm font-medium text-primary">Page unavailable</p>
                <h1 className="font-heading text-2xl font-semibold">This page isn’t available yet</h1>
                <p className="text-sm text-muted-foreground">
                    That destination is not part of the current SmartDrive experience.
                </p>
                <Link
                    to={destination}
                    className="inline-flex min-h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {destinationLabel}
                </Link>
            </div>
        </main>
    );
}
