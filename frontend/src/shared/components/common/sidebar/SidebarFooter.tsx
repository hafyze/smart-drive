import { LogOut } from "lucide-react";
import { NavLink } from "react-router-dom";

import { OWNER_BOTTOM_NAVIGATION } from "@/shared/constants/Navigation";
import { Button } from "../../ui/button";

export function SidebarFooter() {
    const handleLogout = () => {
        // TODO: implement auth in sprint 2
        console.log("logout");
    };

    return(
        <div>
            <div>
                {OWNER_BOTTOM_NAVIGATION.map((item) => {
                    const Icon = item.icon;

                    return (
                        <NavLink 
                            key={item.href}
                            to={item.href}
                            className={({ isActive }) => 
                                [
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5",
                                    "text-sm font-medium transition-colors",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    isActive
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                ].join(" ")  
                            }
                        >
                            <Icon className="size-4 shrink-0" />

                            <span>{item.title}</span>
                        </NavLink>
                    );
                })}

                <Button
                    type="button"
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive"
                >
                    <LogOut className="size-4 shrink-0" />
                    <span>Logout</span>
                </Button>
            </div>
        </div>
    );
}