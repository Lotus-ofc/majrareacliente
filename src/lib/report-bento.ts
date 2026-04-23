import type { ReportSource } from "./sources";

/**
 * Bento report config — decides which metrics become hero KPIs,
 * which feed the donut/comparison/gauges, and which fall into the dense
 * "outras métricas" strip. Tuned so each source fits in ~1080p without scroll.
 */
export interface BentoConfig {
  /** Big KPI cards on the top row (max 4 — keep it tight). */
  kpiKeys: string[];
  /** Secondary, compact metric chips for the bottom strip. */
  secondaryKeys: string[];
  /** Time-series lines (rendered when time_series is present). */
  seriesKeys: string[];
  /** Pie/donut composition. Hidden if <2 non-zero. */
  donutKeys: string[];
  /** Period vs previous period comparison bars. */
  comparisonKeys: string[];
  /** Radial gauges (great for % metrics). Max 3. */
  gaugeKeys: string[];
  /** Optional override for the donut chart title. */
  donutTitle?: string;
  /** Optional override for the line chart title. */
  seriesTitle?: string;
}

export const REPORT_BENTO: Record<ReportSource, BentoConfig> = {
  overview: {
    kpiKeys: ["investment_total", "conversions_total", "cpa_general", "roas"],
    secondaryKeys: [],
    seriesKeys: ["investment_total", "conversions_total"],
    donutKeys: [],
    comparisonKeys: ["investment_total", "conversions_total", "roas"],
    gaugeKeys: [],
    seriesTitle: "Investimento × Conversões",
  },
  ga4: {
    kpiKeys: ["sessions", "key_events", "engagement_rate", "top_source"],
    secondaryKeys: [],
    seriesKeys: ["sessions", "key_events"],
    donutKeys: [],
    comparisonKeys: ["sessions", "key_events"],
    gaugeKeys: ["engagement_rate"],
    seriesTitle: "Tráfego no período",
  },
  meta_ads: {
    kpiKeys: ["investment", "results", "cpa", "ctr"],
    secondaryKeys: [],
    seriesKeys: ["investment", "results"],
    donutKeys: [],
    comparisonKeys: ["investment", "results", "cpa"],
    gaugeKeys: ["ctr"],
    seriesTitle: "Investimento × Resultados",
  },
  google_ads: {
    kpiKeys: ["investment", "conversions", "cpa", "cpc"],
    secondaryKeys: ["impression_share"],
    seriesKeys: ["investment", "conversions"],
    donutKeys: [],
    comparisonKeys: ["investment", "conversions", "cpa"],
    gaugeKeys: ["impression_share"],
    seriesTitle: "Investimento × Conversões",
  },
  tiktok_ads: {
    kpiKeys: ["investment", "video_views", "cpa", "cpc"],
    secondaryKeys: [],
    seriesKeys: ["investment", "video_views"],
    donutKeys: [],
    comparisonKeys: ["investment", "video_views", "cpa"],
    gaugeKeys: [],
    seriesTitle: "Investimento × Visualizações",
  },
  instagram_organic: {
    kpiKeys: ["reach", "interactions", "followers_total", "engagement_rate"],
    secondaryKeys: [
      "views",
      "new_followers",
      "reels_views_total",
      "stories_views_total",
      "posts_total",
      "reels_total",
    ],
    seriesKeys: ["reach", "interactions", "followers_total"],
    donutKeys: ["likes", "comments", "shares", "saves", "profile_link_clicks"],
    comparisonKeys: ["reach", "interactions", "followers_total"],
    gaugeKeys: ["engagement_rate", "growth_rate"],
    donutTitle: "Composição de interações",
    seriesTitle: "Evolução do perfil",
  },
  tiktok_organic: {
    kpiKeys: ["video_views_total", "interactions_total", "followers_total", "engagement_rate"],
    secondaryKeys: [
      "profile_views",
      "new_followers",
      "videos_total",
      "avg_watch_time",
      "interactions_avg_per_post",
    ],
    seriesKeys: ["video_views_total", "interactions_total", "followers_total"],
    donutKeys: ["likes", "comments", "shares"],
    comparisonKeys: ["video_views_total", "interactions_total", "followers_total"],
    gaugeKeys: ["engagement_rate", "watched_full_rate", "growth_rate"],
    donutTitle: "Composição de interações",
    seriesTitle: "Evolução do perfil",
  },
};
