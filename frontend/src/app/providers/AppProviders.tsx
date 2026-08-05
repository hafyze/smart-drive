import { BrowserRouter } from "react-router-dom"
import { ThemeProvider } from "@/shared/components/theme-provider"
import { QueryProvider } from  "./QueryProvider"

interface AppProviderProps {
    children: React.ReactNode
}

export function AppProviders({children}: AppProviderProps) {
    return (
        <QueryProvider>
            <ThemeProvider defaultTheme="system" storageKey="smart-drive-theme">
                <BrowserRouter>{children}</BrowserRouter>
            </ThemeProvider>
        </QueryProvider>
    );
}