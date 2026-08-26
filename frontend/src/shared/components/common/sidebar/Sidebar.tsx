import {
    OWNER_NAVIGATION,
} from "@/shared/constants/Navigation"

import { SidebarBrand } from "./SidebarBrand"
import { SidebarFooter } from "./SidebarFooter"
import { SidebarNav } from "./SidebarNav"

export function Sidebar() {
    return (
        <aside className="hidden sticky top-0 hideen h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
            <SidebarBrand />

            <SidebarNav items={OWNER_NAVIGATION} />

            <SidebarFooter />
        </aside>
    );
}