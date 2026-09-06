export interface Receipt {
    id: string;
    user_id: string;
    vehicle_id: string;
    service_visit_id: string | null;

    original_filename: string;
    stored_filename: string;
    file_url: string;

    content_type: string;
    file_size: number;

    notes: string | null;

    created_at: string;
    updated_at: string;
}

export interface CreateReceiptPayload {
    vehicleId: string;
    file: File;
    serviceVisitId?: string;
    notes?: string;
}

export interface UpdateReceiptPayload {
    notes?: string | null;
    service_visit_id?: string | null;
}

export interface DeleteReceiptResponse {
    success: boolean;
}