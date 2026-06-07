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
  MessageCircle,
  Share2,
  Bookmark,
  Link2,
  Repeat,
  Film,
  Image as ImageIcon,
  Clapperboard,
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
    { key: "reach", label: "Alcance", icon: Users, format: "number" },
    { key: "impressions", label: "Impressões", icon: Eye, format: "number" },
    { key: "frequency", label: "Frequência", icon: Repeat, format: "number" },
    { key: "results", label: "Resultados (Leads/Compras)", icon: Target, format: "number" },
    { key: "cpa", label: "Custo por Resultado (CPA/CPL)", icon: Activity, format: "currency" },
    { key: "conversion_rate", label: "Taxa de Conversão", icon: Percent, format: "percent" },
    { key: "conversion_value", label: "Valor de Conversão / Receita", icon: DollarSign, format: "currency" },
    { key: "roas", label: "ROAS", icon: TrendingUp, format: "number" },
    { key: "link_clicks", label: "Cliques no Link", icon: MousePointerClick, format: "number" },
    { key: "ctr", label: "CTR (Taxa de Clique)", icon: Percent, format: "percent" },
    { key: "cpc", label: "CPC (Custo por Clique)", icon: MousePointerClick, format: "currency" },
    { key: "cpm", label: "CPM (Custo por Mil Impressões)", icon: BarChart3, format: "currency" },
    { key: "landing_page_views", label: "Visualizações da Página de Destino", icon: Globe, format: "number" },
  ],
  google_ads: [
    { key: "investment", label: "Investimento na Plataforma", icon: DollarSign, format: "currency" },
    { key: "impressions", label: "Impressões", icon: Eye, format: "number" },
    { key: "clicks", label: "Cliques", icon: MousePointerClick, format: "number" },
    { key: "ctr", label: "CTR (Taxa de Clique)", icon: Percent, format: "percent" },
    { key: "cpc", label: "CPC Médio", icon: MousePointerClick, format: "currency" },
    { key: "conversions", label: "Conversões", icon: Target, format: "number" },
    { key: "cpa", label: "Custo por Conversão (CPA)", icon: Activity, format: "currency" },
    { key: "conversion_rate", label: "Taxa de Conversão", icon: Percent, format: "percent" },
    { key: "conversion_value", label: "Valor de Conversão / Receita", icon: DollarSign, format: "currency" },
    { key: "roas", label: "ROAS", icon: TrendingUp, format: "number" },
    { key: "cpm", label: "CPM (Custo por Mil Impressões)", icon: BarChart3, format: "currency" },
    { key: "impression_share", label: "Índice de Impressão (Pesquisa)", icon: Percent, format: "percent" },
  ],
  tiktok_ads: [
    { key: "investment", label: "Investimento na Plataforma", icon: DollarSign, format: "currency" },
    { key: "cpa", label: "CPA / Custo por Lead", icon: Activity, format: "currency" },
    { key: "video_views", label: "Visualizações de Vídeo (2s/6s)", icon: PlayCircle, format: "number" },
    { key: "cpc", label: "Custo por Clique (CPC)", icon: MousePointerClick, format: "currency" },
  ],
  instagram_organic: [
    // Resumo geral do perfil
    { key: "reach", label: "Alcance", icon: Users, format: "number" },
    { key: "engagement", label: "Engajamento", icon: Heart, format: "number" },
    { key: "engagement_rate", label: "Taxa de Engajamento", icon: Percent, format: "percent" },
    { key: "frequency", label: "Frequência", icon: Repeat, format: "number" },
    { key: "views", label: "Visualizações", icon: Eye, format: "number" },
    { key: "interactions", label: "Interações", icon: Zap, format: "number" },
    // Detalhamento de interações
    { key: "likes", label: "Curtidas", icon: Heart, format: "number" },
    { key: "comments", label: "Comentários", icon: MessageCircle, format: "number" },
    { key: "shares", label: "Compartilhamentos", icon: Share2, format: "number" },
    { key: "saves", label: "Salvos", icon: Bookmark, format: "number" },
    { key: "profile_link_clicks", label: "Cliques no Link do Perfil", icon: Link2, format: "number" },
    // Seguidores
    { key: "followers_total", label: "Total de Seguidores", icon: Users, format: "number" },
    { key: "new_followers", label: "Novos Seguidores", icon: UserPlus, format: "number" },
    { key: "growth_rate", label: "Taxa de Crescimento", icon: TrendingUp, format: "percent" },
    // Reels
    { key: "reels_total", label: "Total de Reels", icon: Film, format: "number" },
    { key: "reels_views_total", label: "Visualizações Totais (Reels)", icon: PlayCircle, format: "number" },
    { key: "reels_views_avg", label: "Média de Views por Reel", icon: PlayCircle, format: "number" },
    // Posts no feed
    { key: "posts_total", label: "Total de Posts (feed)", icon: ImageIcon, format: "number" },
    { key: "posts_interactions_total", label: "Total de Interações (Posts)", icon: Zap, format: "number" },
    // Stories
    { key: "stories_total", label: "Total de Stories", icon: Clapperboard, format: "number" },
    { key: "stories_views_total", label: "Visualizações Totais (Stories)", icon: Eye, format: "number" },
  ],
  tiktok_organic: [
    // Resumo geral
    { key: "likes", label: "Curtidas", icon: Heart, format: "number" },
    { key: "comments", label: "Comentários", icon: MessageCircle, format: "number" },
    { key: "shares", label: "Compartilhamentos", icon: Share2, format: "number" },
    { key: "profile_views", label: "Visualizações do Perfil", icon: Eye, format: "number" },
    { key: "video_views_total", label: "Visualizações nos Vídeos", icon: PlayCircle, format: "number" },
    { key: "following", label: "Seguindo", icon: UserPlus, format: "number" },
    { key: "videos_total", label: "Total de Vídeos", icon: Film, format: "number" },
    { key: "posts_total", label: "Total de Posts", icon: ImageIcon, format: "number" },
    // Seguidores
    { key: "followers_total", label: "Total de Seguidores", icon: Users, format: "number" },
    { key: "new_followers", label: "Novos Seguidores", icon: UserPlus, format: "number" },
    { key: "growth_rate", label: "Taxa de Crescimento", icon: TrendingUp, format: "percent" },
    // Engajamento
    { key: "engagement_rate", label: "Taxa de Engajamento Geral", icon: Percent, format: "percent" },
    { key: "interactions_total", label: "Total de Interações", icon: Zap, format: "number" },
    { key: "interactions_avg_per_post", label: "Média de Interações por Post", icon: Zap, format: "number" },
    // Vídeos
    { key: "video_views_avg_per_post", label: "Média de Visualizações por Post", icon: PlayCircle, format: "number" },
    { key: "avg_watch_time", label: "Tempo Médio de Visualização (s)", icon: PlayCircle, format: "number" },
    { key: "watched_full_rate", label: "Taxa Média de Vídeo Assistido até o Fim", icon: Percent, format: "percent" },
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
