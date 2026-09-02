import { useQuery } from "@tanstack/react-query";

import { serviceHistoryApi } from "../api/serviceHistoryApi";

const SERVICE_HISTORY_QUERY_KEY = ["service-history"] as const;

export const useServiceHistory = (vehicleId: string) => {
    return useQuery({
        queryKey: [
            ...SERVICE_HISTORY_QUERY_KEY,
            vehicleId,
        ],
        queryFn: () => serviceHistoryApi.getByVehicle(vehicleId),
        enabled: Boolean(vehicleId),
    })
}