import type { MaintenanceSourceType } from "./maintenanceResearch";

export interface ConversationSummary {
    id: string;
    vehicle_id: string;
    title: string;
    created_at: string;
    updated_at: string;
    expires_at: string;
    turn_count: number;
}

export interface ConversationMaintenanceRecord {
    reference: string;
    service_date: string;
    mileage_at_service: number | null;
    type: string;
    description: string | null;
    next_due_date: string | null;
    next_due_mileage: number | null;
}

export interface ChatResearchClaim {
    claim: string;
    source_urls: string[];
}

export interface ConversationSource {
    url: string;
    title: string;
    name: string;
    source_type: MaintenanceSourceType;
}

export interface ConversationAnswer {
    recorded_information: ConversationMaintenanceRecord[];
    researched_claims: ChatResearchClaim[];
    sources: ConversationSource[];
    interpretation: string | null;
    limitations: string[];
}

export interface ConversationTurn {
    id: string;
    client_message_id: string;
    question: string;
    answer: ConversationAnswer | null;
    status: string;
    created_at: string;
}

export interface ConversationDetail extends ConversationSummary {
    turns: ConversationTurn[];
}
