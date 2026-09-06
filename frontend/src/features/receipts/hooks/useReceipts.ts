import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import { receiptApi } from "../api/receiptApi";

import type {
    CreateReceiptPayload,
    UpdateReceiptPayload,
} from "../types/receipt";

export const receiptKeys = {
    all: ["receipts"] as const,

    list: (
        vehicleId?: string,
        serviceVisitId?: string,
    ) =>
        [
            ...receiptKeys.all,
            "list",
            vehicleId,
            serviceVisitId,
        ] as const,

    detail: (receiptId: string) =>
        [
            ...receiptKeys.all,
            "detail",
            receiptId,
        ] as const,
};

export function useReceipts(
    vehicleId?: string,
    serviceVisitId?: string,
) {
    return useQuery({
        queryKey: receiptKeys.list(
            vehicleId,
            serviceVisitId,
        ),
        queryFn: () =>
            receiptApi.getAll(
                vehicleId,
                serviceVisitId,
            ),
    });
}

export function useReceipt(
    receiptId: string,
) {
    return useQuery({
        queryKey: receiptKeys.detail(
            receiptId,
        ),
        queryFn: () =>
            receiptApi.getById(
                receiptId,
            ),
        enabled: Boolean(receiptId),
    });
}

export function useCreateReceipt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (
            payload: CreateReceiptPayload,
        ) =>
            receiptApi.create(
                payload,
            ),

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: receiptKeys.all,
            });
        },
    });
}

export function useUpdateReceipt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            receiptId,
            payload,
        }: {
            receiptId: string;
            payload: UpdateReceiptPayload;
        }) =>
            receiptApi.update(
                receiptId,
                payload,
            ),

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: receiptKeys.all,
            });
        },
    });
}

export function useDeleteReceipt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (
            receiptId: string,
        ) =>
            receiptApi.delete(
                receiptId,
            ),

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: receiptKeys.all,
            });
        },
    });
}