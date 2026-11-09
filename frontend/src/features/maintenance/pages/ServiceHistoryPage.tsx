import { Navigate, useParams } from "react-router-dom";

/** Keep the existing service-history URL working while using the vehicle's unified tabbed details page. */
export default function ServiceHistoryPage() {
    const { vehicleId } = useParams();
    if (!vehicleId) return <Navigate to="/garage" replace />;
    return <Navigate to={`/garage/${vehicleId}?tab=history`} replace />;
}
