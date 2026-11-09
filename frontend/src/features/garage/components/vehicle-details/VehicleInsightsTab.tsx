import { useState } from "react";
import { BrainCircuit, Gauge, SearchCheck } from "lucide-react";

import { MaintenanceResearchPanel } from "@/features/maintenance/components/MaintenanceResearchPanel";
import { VehicleMaintenanceAssistant } from "@/features/maintenance/components/VehicleMaintenanceAssistant";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import type { VehicleResponse } from "@/features/garage/types/vehicle";
import { PredictiveMaintenancePanel } from "@/features/maintenance/components/PredictiveMaintenancePanel";

export function VehicleInsightsTab({ vehicle }: { vehicle: VehicleResponse }) {
    const [activeSection, setActiveSection] = useState<"assistant" | "research" | "predictive">("predictive");
    return (
        <div className="space-y-5">
            <Card className="border-white/10 bg-[#121518] text-white">
                <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
                    <div className="flex gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[.07]"><Gauge className="size-5 text-red-300" /></span>
                        <div><h2 className="font-semibold">Maintenance tracking</h2><p className="mt-1 text-sm text-white/55">The score uses saved next-due schedules and fixed rules. It does not use an LLM or assess physical condition.</p></div>
                    </div>
                    <div className="flex gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[.07]"><SearchCheck className="size-5 text-red-300" /></span>
                        <div><h2 className="font-semibold">Predictive preventive maintenance</h2><p className="mt-1 text-sm text-white/55">Research-based attention categories with traceable sources. These are not failure probabilities or a diagnosis.</p></div>
                    </div>
                    <div className="flex gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[.07]"><BrainCircuit className="size-5 text-red-300" /></span>
                        <div><h2 className="font-semibold">Vehicle assistant</h2><p className="mt-1 text-sm text-white/55">Ask questions about saved records and get cautious, source-linked automotive information. The assistant is read-only.</p></div>
                    </div>
                </CardContent>
            </Card>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Vehicle AI insights">
                <Button role="tab" aria-selected={activeSection === "assistant"} variant={activeSection === "assistant" ? "default" : "outline"} onClick={() => setActiveSection("assistant")}>AI Assistant</Button>
                <Button role="tab" aria-selected={activeSection === "research"} variant={activeSection === "research" ? "default" : "outline"} onClick={() => setActiveSection("research")}>Research guidance</Button>
                <Button role="tab" aria-selected={activeSection === "predictive"} variant={activeSection === "predictive" ? "default" : "outline"} onClick={() => setActiveSection("predictive")}>Predictive maintenance</Button>
            </div>
            {activeSection === "assistant"
                ? <VehicleMaintenanceAssistant key={vehicle.id} vehicle={vehicle} />
                : activeSection === "research"
                    ? <MaintenanceResearchPanel key={vehicle.id} vehicleId={vehicle.id} />
                    : <PredictiveMaintenancePanel key={vehicle.id} vehicleId={vehicle.id} />}
        </div>
    );
}
