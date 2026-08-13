import { CarFront } from "lucide-react";

export function SidebarBrand() {
    return (
        <div className="flex h-16 items-center gap-3 px-5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <CarFront className="size-5"/>
            </div>

            <div className="flex flex-col">
                <span className="font-heading text-sm font-semibold tracking-tight">
                    Smart Drive
                </span>

                <span className="text-xs text-muted-foreground">
                    Vehicle Intelligence
                </span>
            </div>
        </div>
    );
}