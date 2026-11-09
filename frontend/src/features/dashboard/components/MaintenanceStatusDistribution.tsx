import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import type { MaintenanceDistribution } from "../utils/dashboardData";

const entries = [
    { key: "UP_TO_DATE", label: "Up to date", color: "#22c55e" },
    { key: "DUE_SOON", label: "Due soon", color: "#f59e0b" },
    { key: "OVERDUE", label: "Overdue", color: "#ef4444" },
    { key: "NO_DATA", label: "No schedule", color: "#717b86" },
] as const;

export function MaintenanceStatusDistribution({ distribution, isLoading, isError }: { distribution: MaintenanceDistribution; isLoading: boolean; isError: boolean }) {
    const data = entries.map((entry) => ({ ...entry, value: distribution[entry.key] }));
    const total = data.reduce((sum, entry) => sum + entry.value, 0);
    return <Card className="border-white/10 bg-[#101214] text-white"><CardHeader className="px-4 pb-2 pt-4 sm:px-5"><h2 className="font-heading text-lg font-semibold">Maintenance Status</h2><p className="text-xs text-white/50">Latest schedule for each maintenance type</p></CardHeader><CardContent className="p-4 pt-1 sm:p-5 sm:pt-2">{isLoading ? <div className="h-44 animate-pulse rounded-xl bg-white/[0.05]"/> : isError ? <div className="flex h-44 items-center justify-center text-center text-sm text-white/55">Maintenance status is unavailable.</div> : total === 0 ? <div className="flex h-44 items-center justify-center text-center text-sm text-white/55">No service schedule has been recorded yet.</div> : <div className="grid items-center gap-2 sm:grid-cols-[minmax(120px,1fr)_minmax(120px,1fr)]"><div className="relative h-44 min-w-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.filter((item) => item.value > 0)} dataKey="value" nameKey="label" innerRadius="65%" outerRadius="92%" paddingAngle={2} stroke="none">{data.filter((item) => item.value > 0).map((item) => <Cell key={item.key} fill={item.color}/>)}</Pie><Tooltip contentStyle={{ background: "#171a1e", border: "1px solid #34383e", borderRadius: 10, color: "#fff" }}/></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="font-heading text-3xl font-bold">{total}</span><span className="text-[10px] text-white/50">items</span></div></div><ul className="space-y-2">{data.map((entry) => <li key={entry.key} className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-2 text-xs last:border-0"><span className="flex min-w-0 items-center gap-2 text-white/70"><span className="size-2 shrink-0 rounded-full" style={{ background: entry.color }}/>{entry.label}</span><span className="font-semibold tabular-nums">{entry.value}</span></li>)}</ul></div>}</CardContent></Card>;
}

