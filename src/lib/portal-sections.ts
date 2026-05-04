import { BarChart3, Bell, CalendarDays, NotebookPen, Wallet, type LucideIcon } from "lucide-react";

export type PortalSection = "news" | "reports" | "calendar" | "editorial" | "finance";

export interface PortalSectionMeta {
  key: PortalSection;
  label: string;
  icon: LucideIcon;
}

export const PORTAL_SECTIONS: PortalSectionMeta[] = [
  { key: "news", label: "Novidades", icon: Bell },
  { key: "reports", label: "Relatórios", icon: BarChart3 },
  { key: "calendar", label: "Aprovação de Posts", icon: CalendarDays },
  { key: "editorial", label: "Calendário Editorial", icon: NotebookPen },
  { key: "finance", label: "Financeiro", icon: Wallet },
];
