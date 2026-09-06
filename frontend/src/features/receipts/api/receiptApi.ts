import api from "@/shared/api/axios";

import type {
    CreateReceiptPayload,
    DeleteReceiptResponse,
    Receipt,
    UpdateReceiptPayload,
} from "../types/receipt";

export const receiptApi = {
    getAll: async (
        vehicleId?: string,
        serviceVisitId?: string,
    ): Promise<Receipt[]> => {
        const response = await api.get<Receipt[]>(
            "/receipts",
            {
                params: {
                    ...(vehicleId
                        ? { vehicle_id: vehicleId }
                        : {}),
                    ...(serviceVisitId
                        ? { service_visit_id: serviceVisitId }
                        : {}),
                },
            },
        );

        return response.data;
    },

    getById: async (
        receiptId: string,
    ): Promise<Receipt> => {
        const response = await api.get<Receipt>(
            `/receipts/${receiptId}`,
        );

        return response.data;
    },

    create: async (
        payload: CreateReceiptPayload,
    ): Promise<Receipt> => {
        const formData = new FormData();

        formData.append(
            "vehicle_id",
            payload.vehicleId,
        );

        formData.append(
            "file",
            payload.file,
        );

        if (payload.serviceVisitId) {
            formData.append(
                "service_visit_id",
                payload.serviceVisitId,
            );
        }

        if (payload.notes) {
            formData.append(
                "notes",
                payload.notes,
            );
        }

        const response = await api.post<Receipt>(
            "/receipts",
            formData,
        );

        return response.data;
    },

    update: async (
        receiptId: string,
        payload: UpdateReceiptPayload,
    ): Promise<Receipt> => {
        const response = await api.put<Receipt>(
            `/receipts/${receiptId}`,
            payload,
        );

        return response.data;
    },

    delete: async (
        receiptId: string,
    ): Promise<DeleteReceiptResponse> => {
        const response =
            await api.delete<DeleteReceiptResponse>(
                `/receipts/${receiptId}`,
            );

        return response.data;
    },
};