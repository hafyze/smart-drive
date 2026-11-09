import {
  LayoutDashboard,
  Car,
  BrainCircuit,
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
    title: "Maintenance",
    href: "/ai",
    icon: BrainCircuit,
  },
];

export const OWNER_BOTTOM_NAVIGATION: NavigationItem[] = [];
