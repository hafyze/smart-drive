import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import PublicOnlyRoute from "./PublicOnlyRoute";

import DashboardLayout from "@/layouts/DashboardLayout";
import AuthLayout from "@/layouts/AuthLayout";

import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import GaragePage from "@/features/garage/pages/GaragePage";

import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterPage from "@/features/auth/pages/RegisterPage";

import MaintenancePage from "@/features/maintenance/pages/MaintenancePage";
import VehicleDetailsPage from "@/features/garage/pages/VehicleDetailsPage";
import ServiceHistoryPage from "@/features/maintenance/pages/ServiceHistoryPage";
import MaintenancePlannerPage from "@/features/maintenance/pages/MaintenancePlannerPage";
import NotFoundPage from "./NotFoundPage";

import { ROUTES } from "./routes";

export default function AppRouter() {
    return (
        <Routes>
            <Route element={<PublicOnlyRoute />}>
                <Route element={<AuthLayout />}>
                    <Route path={ROUTES.LOGIN} element={<LoginPage />} />
                    <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
                </Route>
            </Route>

            <Route
                path={ROUTES.HOME}
                element={<Navigate to={ROUTES.DASHBOARD} replace />}
            />

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
                        path={ROUTES.MAINTENANCE_PLANNER}
                        element={<MaintenancePlannerPage />}
                    />

                </Route>
            </Route>

            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    )
}
