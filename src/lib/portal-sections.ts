import { BarChart3, CalendarDays, Wallet, type LucideIcon } from "lucide-react";

export type PortalSection = "reports" | "calendar" | "finance";

export interface PortalSectionMeta {
  key: PortalSection;
  label: string;
  icon: LucideIcon;
}

export const PORTAL_SECTIONS: PortalSectionMeta[] = [
  { key: "reports", label: "Relatórios", icon: BarChart3 },
  { key: "calendar", label: "Aprovação de Posts", icon: CalendarDays },
  { key: "finance", label: "Financeiro", icon: Wallet },
];
