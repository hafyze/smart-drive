import { Bell, Moon, Sun } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

import { MobileSidebar } from "./sidebar/MobileSidebar";
import { useTheme } from "@/shared/components/theme-provider";

export function Navbar() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <MobileSidebar />

        <div className="hidden flex-col md:flex">
          <span className="text-sm font-medium">Dashboard</span>
          <span className="text-xs text-muted-foreground">
            Vehicle overview
          </span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1">
        {/* Theme */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Change theme"
              />
            }
          >
            {theme === "dark" ? (
              <Moon className="size-4" />
            ) : (
              <Sun className="size-4" />
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              Light
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setTheme("dark")}>
              Dark
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setTheme("system")}>
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
        </Button>
      </div>
    </header>
  );
}