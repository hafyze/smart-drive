import {
  LayoutDashboard,
  Car,
  BrainCircuit,
  Wrench,
  ChartColumn,
  // Truck,
  Settings,
  User,
} from "lucide-react";

export interface NavigationItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

export const OWNER_NAVIGATION: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Garage",
    href: "/garage",
    icon: Car,
  },
  {
    title: "AI Maintenance",
    href: "/ai",
    icon: BrainCircuit,
  },
  {
    title: "Workshops",
    href: "/workshops",
    icon: Wrench,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: ChartColumn,
  },
];

export const OWNER_BOTTOM_NAVIGATION: NavigationItem[] = [
  {
    title: "Profile",
    href: "/profile",
    icon: User,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];