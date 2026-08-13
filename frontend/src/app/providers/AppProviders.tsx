import { BrowserRouter } from "react-router-dom"
import { ThemeProvider } from "@/shared/components/theme-provider"
import { QueryProvider } from  "./QueryProvider"
import { AuthInitializer } from "@/features/auth/components/AuthInitializer"
import { Toaster } from "@/shared/components/ui/toast"

interface AppProviderProps {
    children: React.ReactNode
}

export function AppProviders({children}: AppProviderProps) {
    return (
        <QueryProvider>
            <ThemeProvider defaultTheme="system" storageKey="smart-drive-theme">
                <BrowserRouter>
                    <AuthInitializer />
                    {children}

                    <Toaster />
                </BrowserRouter>
            </ThemeProvider>
        </QueryProvider>
    );
}