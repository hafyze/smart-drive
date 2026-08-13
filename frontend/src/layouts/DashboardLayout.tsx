import { Outlet } from "react-router-dom";

import { Sidebar } from "@/shared/components/common/sidebar";
import { Navbar } from "@/shared/components/common/Navbar";

export default function DashboardLayout() {
    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />

            <div className="flex min-w-0 flex-1 flex-col">
                <Navbar />
                <main className="flex-1">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}