import { LayoutDashboard, BarChart3, Facebook, Globe, Music2, Instagram, Hash } from "lucide-react";

export type ReportSource =
  | "overview"
  | "ga4"
  | "meta_ads"
  | "google_ads"
  | "tiktok_ads"
  | "instagram_organic"
  | "tiktok_organic";

export interface SourceMeta {
  key: ReportSource;
  label: string;
  icon: typeof LayoutDashboard;
}

export const SOURCES: SourceMeta[] = [
  { key: "overview", label: "Visão Geral", icon: LayoutDashboard },
  { key: "ga4", label: "GA4", icon: BarChart3 },
  { key: "meta_ads", label: "Meta Ads", icon: Facebook },
  { key: "google_ads", label: "Google Ads", icon: Globe },
  { key: "tiktok_ads", label: "TikTok Ads", icon: Music2 },
  { key: "instagram_organic", label: "Instagram Orgânico", icon: Instagram },
  { key: "tiktok_organic", label: "TikTok Orgânico", icon: Hash },
];

export const DEFAULT_WHATSAPP =
  "https://wa.me/5500000000000?text=Ol%C3%A1%2C%20preciso%20de%20suporte%20no%20portal";
