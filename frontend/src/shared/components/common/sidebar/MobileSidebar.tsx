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

            <SheetContent>
                <div>
                    <SidebarBrand />

                    <SidebarNav items={OWNER_NAVIGATION} />

                    <SidebarFooter />
                </div>
            </SheetContent>
        </Sheet>
    )
}