import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";

import DashboardLayout from "@/layouts/DashboardLayout";
import AuthLayout from "@/layouts/AuthLayout";

import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import GaragePage from "@/features/garage/pages/GaragePage";

import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterPage from "@/features/auth/pages/RegisterPage";

import MaintenancePage from "@/features/maintenance/pages/MaintenancePage";
import WorkshopsPage from "@/features/workshops/pages/WorkshopsPage";
import AnalyticsPage from "@/features/analytics/pages/AnalyticsPage";
import FleetPage from "@/features/fleet/pages/FleetPage";
import ProfilePage from "@/features/profile/pages/ProfilePage";
import SettingsPage from "@/features/settings/pages/SettingsPage";
import VehicleDetailsPage from "@/features/garage/pages/VehicleDetailsPage";
import ServiceHistoryPage from "@/features/maintenance/pages/ServiceHistoryPage";

import { ROUTES } from "./routes";

export default function AppRouter() {
    return (
        <Routes>
            <Route element={<AuthLayout />}>
                <Route path={ROUTES.LOGIN} element={<LoginPage />} />
                <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                    <Route
                        path={ROUTES.DASHBOARD}
                        element={<DashboardPage />}
                    />

                    <Route
                        path={ROUTES.GARAGE}
                        element={<GaragePage />}
                    />
                    <Route 
                        path={ROUTES.GARAGE_VEHICLE}
                        element={<VehicleDetailsPage />}
                    />

                    <Route
                        path="/garage/:vehicleId/service-history"
                        element={<ServiceHistoryPage />}
                    />
                    
                    <Route
                        path={ROUTES.AI}
                        element={<MaintenancePage />}
                    />

                    <Route
                        path={ROUTES.WORKSHOPS}
                        element={<WorkshopsPage />}
                    />

                    <Route
                        path={ROUTES.ANALYTICS}
                        element={<AnalyticsPage />}
                    />

                    <Route
                        path={ROUTES.FLEET}
                        element={<FleetPage />}
                    />

                    <Route
                        path={ROUTES.PROFILE}
                        element={<ProfilePage />}
                    />

                    <Route
                        path={ROUTES.SETTINGS}
                        element={<SettingsPage />}
                    />

                </Route>
            </Route>

            <Route
                path="*"
                element={<Navigate to={ROUTES.LOGIN} replace />}
            />
        </Routes>
    )
}