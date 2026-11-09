import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ExternalLink, LoaderCircle } from "lucide-react";

import { maintenanceResearchApi } from "../api/maintenanceResearchApi";
import type { MaintenanceKnowledgeProfile, MaintenanceRecommendationType } from "../types/maintenanceResearch";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { getApiErrorMessage } from "@/shared/utils/api-error";

const RECOMMENDATION_LABELS: Record<MaintenanceRecommendationType, string> = {
    SCHEDULED: "Scheduled maintenance",
    PREVENTIVE: "Preventive guidance",
    INSPECTION: "Inspection suggestion",
};

export function MaintenanceResearchPanel({ vehicleId }: { vehicleId: string }) {
    const [profile, setProfile] = useState<MaintenanceKnowledgeProfile | null>(null);
    const controller = useRef<AbortController | null>(null);
    const research = useMutation({
        mutationFn: (signal: AbortSignal) => maintenanceResearchApi.research(vehicleId, signal),
        onSuccess: setProfile,
    });

    useEffect(() => () => controller.current?.abort(), []);

    const handleResearch = () => {
        if (research.isPending) return;
        const nextController = new AbortController();
        controller.current = nextController;
        research.mutate(nextController.signal);
    };

    return (
        <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h2 className="font-heading text-lg font-semibold">Research-based maintenance guidance</h2>
                    <p className="text-sm text-muted-foreground">Uses your vehicle identity, summarized saved maintenance history, and cited technical sources.</p>
                </div>
                <Button type="button" onClick={handleResearch} disabled={research.isPending}>
                    {research.isPending && <LoaderCircle className="size-4 animate-spin" />}
                    {research.isPending ? "Researching…" : profile ? "Research again" : "Research maintenance"}
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                    Research uses Gemini and web search providers. It sends make, model, year, transmission, current mileage, and summarized saved maintenance records. Receipts, account details, plate number, VIN, service notes, and costs are not sent. Recommendations are informational and do not diagnose the vehicle.
                </p>

                {research.error && (
                    <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                        {getApiErrorMessage(research.error)}
                    </div>
                )}

                {!profile && !research.isPending && !research.error && (
                    <p className="text-sm text-muted-foreground">Start a research run to see source-checked guidance for this vehicle.</p>
                )}

                {profile && profile.guidance.length === 0 && (
                    <p className="rounded-md border p-3 text-sm text-muted-foreground">No guidance passed source and vehicle checks. Try again later or confirm the vehicle details.</p>
                )}

                {profile && profile.guidance.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">
                            Vehicle match confidence: {profile.vehicle_match_confidence.toLowerCase()} · Researched {new Date(profile.generated_at).toLocaleString()}
                        </p>
                        {profile.guidance.map((item) => (
                            <article key={item.key} className="space-y-3 rounded-lg border p-4">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <h3 className="font-medium">{item.name}</h3>
                                        <p className="text-xs text-muted-foreground">{RECOMMENDATION_LABELS[item.recommendation_type]} · {item.confidence.toLowerCase()} confidence</p>
                                    </div>
                                    <div className="text-right text-xs text-muted-foreground">
                                        {item.interval_km !== null && <p>Every {item.interval_km.toLocaleString()} km</p>}
                                        {item.interval_months !== null && <p>Every {item.interval_months} months</p>}
                                        {item.starting_mileage !== null && <p>From {item.starting_mileage.toLocaleString()} km</p>}
                                    </div>
                                </div>
                                {item.description && <p className="text-sm">{item.description}</p>}
                                {item.reason && <p className="text-sm text-muted-foreground">{item.reason}</p>}
                                <ul className="space-y-1 border-t pt-3 text-xs">
                                    {item.sources.map((source) => (
                                        <li key={source.url}>
                                            <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
                                                {source.title || source.name}
                                                <ExternalLink className="size-3" aria-hidden="true" />
                                            </a>
                                            <span className="ml-2 text-muted-foreground">{source.source_type.toLowerCase().replaceAll("_", " ")}</span>
                                        </li>
                                    ))}
                                </ul>
                            </article>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
