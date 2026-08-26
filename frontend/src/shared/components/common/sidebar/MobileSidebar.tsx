import { Menu } from "lucide-react"

import { OWNER_NAVIGATION } from "@/shared/constants/Navigation";

import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/shared/components/ui/sheet";

import { SidebarBrand } from "./SidebarBrand";
import { SidebarNav } from "./SidebarNav";
import { SidebarFooter } from "./SidebarFooter";

export function MobileSidebar() {
    return (
        <Sheet>
            <SheetTrigger render={
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    aria-label="Open navigation"
                />
                }
            >
                <Menu className="size-5" />
            </SheetTrigger>

            <SheetContent
                side="left"
                className="w-64 p-0"
            >
                <div className="flex h-full flex-col">
                    <SidebarBrand />

                    <div className="flex-1 overflow-y-auto">
                        <SidebarNav items={OWNER_NAVIGATION} />
                    </div>

                    <SidebarFooter />
                </div>
            </SheetContent>
        </Sheet>
    )
}