import { NavLink } from "react-router-dom"
import type { NavigationItem } from "@/shared/constants/Navigation"

interface SidebarNavProps {
    items: NavigationItem[]
}

export function SidebarNav({ items }: SidebarNavProps) {
    return (
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
            {items.map((item) => {
                const Icon = item.icon;

                return (
                    <NavLink
                        key={item.href}
                        to={item.href}
                        className={({ isActive }) => 
                            [
                                "flex items-center gap-3 rounded-lg px-3 py-2.5",
                                "text-sm font-medium transition-colors",
                                "focus-visibile:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                isActive
                                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            ].join(" ")
                        }
                    >
                        <Icon className="size-4 shrink-0" />

                        <span>{item.title}</span>
                    </NavLink>
                );
            })}
        </nav>
    )
}
