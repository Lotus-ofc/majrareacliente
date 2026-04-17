import {
  DollarSign,
  Target,
  TrendingUp,
  Activity,
  MousePointerClick,
  Eye,
  Users,
  UserPlus,
  Heart,
  PlayCircle,
  Globe,
  Percent,
  BarChart3,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ReportSource } from "./sources";

export type MetricFormat = "currency" | "number" | "percent" | "text";

export interface MetricDef {
  key: string;
  label: string;
  icon: LucideIcon;
  format: MetricFormat;
  hint?: string;
}

export const METRICS_BY_SOURCE: Record<ReportSource, MetricDef[]> = {
  overview: [
    { key: "investment_total", label: "Investimento Total", icon: DollarSign, format: "currency" },
    { key: "conversions_total", label: "Total de Conversões / Leads", icon: Target, format: "number" },
    { key: "cpa_general", label: "CPA / CPL Geral", icon: Activity, format: "currency" },
    { key: "roas", label: "ROAS / Receita Estimada", icon: TrendingUp, format: "currency" },
  ],
  ga4: [
    { key: "sessions", label: "Sessões Totais", icon: BarChart3, format: "number" },
    { key: "engagement_rate", label: "Taxa de Engajamento", icon: Percent, format: "percent" },
    { key: "key_events", label: "Eventos Principais (Conversões)", icon: Zap, format: "number" },
    { key: "top_source", label: "Top Origem de Tráfego", icon: Globe, format: "text" },
  ],
  meta_ads: [
    { key: "investment", label: "Investimento na Plataforma", icon: DollarSign, format: "currency" },
    { key: "results", label: "Resultados (Leads/Compras)", icon: Target, format: "number" },
    { key: "cpa", label: "Custo por Resultado (CPA/CPL)", icon: Activity, format: "currency" },
    { key: "ctr", label: "CTR (Taxa de Clique)", icon: Percent, format: "percent" },
  ],
  google_ads: [
    { key: "investment", label: "Investimento na Plataforma", icon: DollarSign, format: "currency" },
    { key: "conversions", label: "Conversões", icon: Target, format: "number" },
    { key: "cpa", label: "Custo por Conversão (CPA)", icon: Activity, format: "currency" },
    { key: "cpc", label: "CPC Médio", icon: MousePointerClick, format: "currency" },
    { key: "impression_share", label: "Índice de Impressão (Pesquisa)", icon: Percent, format: "percent" },
  ],
  tiktok_ads: [
    { key: "investment", label: "Investimento na Plataforma", icon: DollarSign, format: "currency" },
    { key: "cpa", label: "CPA / Custo por Lead", icon: Activity, format: "currency" },
    { key: "video_views", label: "Visualizações de Vídeo (2s/6s)", icon: PlayCircle, format: "number" },
    { key: "cpc", label: "Custo por Clique (CPC)", icon: MousePointerClick, format: "currency" },
  ],
  instagram_organic: [
    { key: "reach", label: "Contas Alcançadas", icon: Users, format: "number" },
    { key: "engaged", label: "Contas Engajadas", icon: Heart, format: "number" },
    { key: "new_followers", label: "Novos Seguidores", icon: UserPlus, format: "number" },
    { key: "profile_visits", label: "Visitas ao Perfil", icon: Eye, format: "number" },
  ],
  tiktok_organic: [
    { key: "views_total", label: "Visualizações Totais", icon: PlayCircle, format: "number" },
    { key: "new_followers", label: "Novos Seguidores", icon: UserPlus, format: "number" },
    { key: "engagement_rate", label: "Taxa de Engajamento Geral", icon: Percent, format: "percent" },
    { key: "profile_views", label: "Visualizações do Perfil", icon: Eye, format: "number" },
  ],
};

export function formatMetricValue(raw: string | undefined | null, format: MetricFormat): string {
  const value = (raw ?? "").trim();
  if (!value) return "—";

  if (format === "text") return value;

  // accept "1.234,56" or "1234.56" or "1,234.56"
  const normalized = value
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const num = Number(normalized);
  if (!Number.isFinite(num)) return value;

  if (format === "currency") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2,
    }).format(num);
  }
  if (format === "percent") {
    return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(num)}%`;
  }
  // number
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(num);
}
