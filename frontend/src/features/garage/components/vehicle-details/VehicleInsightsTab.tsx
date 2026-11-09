import { BrainCircuit, Gauge } from "lucide-react";

import { MaintenanceResearchPanel } from "@/features/maintenance/components/MaintenanceResearchPanel";
import { Card, CardContent } from "@/shared/components/ui/card";

export function VehicleInsightsTab({ vehicleId }: { vehicleId: string }) {
    return (
        <div className="space-y-5">
            <Card className="border-white/10 bg-[#121518] text-white">
                <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
                    <div className="flex gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[.07]"><Gauge className="size-5 text-red-300" /></span>
                        <div><h2 className="font-semibold">Maintenance tracking</h2><p className="mt-1 text-sm text-white/55">The score uses saved next-due schedules and fixed rules. It does not use an LLM or assess physical condition.</p></div>
                    </div>
                    <div className="flex gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[.07]"><BrainCircuit className="size-5 text-red-300" /></span>
                        <div><h2 className="font-semibold">Source-based research</h2><p className="mt-1 text-sm text-white/55">Optional Gemini research is based on web evidence and saved history. Provider credentials must be configured; results may be empty.</p></div>
                    </div>
                </CardContent>
            </Card>
            <MaintenanceResearchPanel key={vehicleId} vehicleId={vehicleId} />
        </div>
    );
}
