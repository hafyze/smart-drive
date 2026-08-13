import axios from "axios"
import type { ApiErrorResponse } from "../types/api"

export function getApiErrorMessage(error: unknown): string {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
        return (
            error.response?.data?.detail ??
            error.response?.data?.message ??
            error.response?.data?.error ??
            error.message
        );
    }
    if (error instanceof Error) {
        return error.message;
    }

    return "An unexpected error occurred."
}