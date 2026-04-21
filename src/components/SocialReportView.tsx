import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, CalendarRange } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { formatMetricValue, type MetricDef } from "@/lib/metrics";

export interface SocialReportData {
  metrics: Record<string, string>;
  previous_metrics?: Record<string, string> | null;
  period_start?: string | null;
  period_end?: string | null;
  time_series?: Array<Record<string, string | number>> | null;
}

interface Section {
  title: string;
  keys: string[];
}

interface Props {
  data: SocialReportData;
  metricDefs: MetricDef[];
  sections: Section[];
  /** Keys used for the Pie chart (interaction breakdown). */
  interactionPieKeys?: string[];
  /** Keys used for the time-series LineChart. */
  seriesKeys?: string[];
  /** Keys used for the "Antes vs Depois" comparison BarChart. */
  comparisonKeys?: string[];
  /** Optional radial gauges (e.g. engagement_rate, growth_rate). */
  gaugeKeys?: string[];
}

const PIE_COLORS = [
  "oklch(0.62 0.22 305)",
  "oklch(0.72 0.18 200)",
  "oklch(0.78 0.16 145)",
  "oklch(0.78 0.16 80)",
  "oklch(0.68 0.20 25)",
];

function toNumber(raw: string | undefined | null): number {
  const value = (raw ?? "").trim();
  if (!value) return 0;
  const normalized = value
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function formatPeriod(start?: string | null, end?: string | null): string | null {
  if (!start && !end) return null;
  const fmt = (iso?: string | null) => {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  };
  return `${fmt(start)} — ${fmt(end)}`;
}

function VariationBadge({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  if (previous === 0 || !Number.isFinite(previous)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
        <Minus className="h-3 w-3" /> sem comparativo
      </span>
    );
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const positive = pct >= 0;
  const Icon = pct === 0 ? Minus : positive ? TrendingUp : TrendingDown;
  const tone = pct === 0
    ? "bg-secondary text-muted-foreground"
    : positive
      ? "bg-mint/15 text-mint"
      : "bg-destructive/15 text-destructive";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${tone}`}>
      <Icon className="h-3 w-3" />
      {pct > 0 ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}

export function SocialReportView({
  data,
  metricDefs,
  sections,
  interactionPieKeys,
  seriesKeys,
  comparisonKeys,
  gaugeKeys,
}: Props) {
  const defByKey = useMemo(
    () => Object.fromEntries(metricDefs.map((d) => [d.key, d])),
    [metricDefs],
  );

  const period = formatPeriod(data.period_start, data.period_end);
  const hasPrevious = data.previous_metrics && Object.keys(data.previous_metrics).length > 0;

  const pieData = useMemo(() => {
    if (!interactionPieKeys?.length) return [];
    return interactionPieKeys
      .map((k) => {
        const def = defByKey[k];
        if (!def) return null;
        const v = toNumber(data.metrics[k]);
        if (v <= 0) return null;
        return { name: def.label, key: k, value: v };
      })
      .filter((x): x is { name: string; key: string; value: number } => x !== null);
  }, [interactionPieKeys, data.metrics, defByKey]);

  const comparisonData = useMemo(() => {
    if (!comparisonKeys?.length || !hasPrevious) return [];
    return comparisonKeys
      .map((k) => {
        const def = defByKey[k];
        if (!def) return null;
        const cur = toNumber(data.metrics[k]);
        const prev = toNumber(data.previous_metrics?.[k]);
        if (cur === 0 && prev === 0) return null;
        return {
          name: def.label.split(" (")[0],
          Anterior: prev,
          Atual: cur,
        };
      })
      .filter((x): x is { name: string; Anterior: number; Atual: number } => x !== null);
  }, [comparisonKeys, data.metrics, data.previous_metrics, defByKey, hasPrevious]);

  const seriesData = useMemo(() => {
    const ts = data.time_series ?? [];
    if (!Array.isArray(ts) || ts.length === 0 || !seriesKeys?.length) return [];
    return ts.map((p) => {
      const out: Record<string, string | number> = { date: String(p.date) };
      seriesKeys.forEach((k) => {
        const v = p[k];
        out[k] = typeof v === "number" ? v : toNumber(typeof v === "string" ? v : "");
      });
      return out;
    });
  }, [data.time_series, seriesKeys]);

  const gauges = useMemo(() => {
    if (!gaugeKeys?.length) return [];
    return gaugeKeys
      .map((k) => {
        const def = defByKey[k];
        if (!def) return null;
        const v = toNumber(data.metrics[k]);
        return { key: k, label: def.label, value: v, format: def.format };
      })
      .filter((x): x is { key: string; label: string; value: number; format: MetricDef["format"] } => x !== null);
  }, [gaugeKeys, data.metrics, defByKey]);

  return (
    <div className="flex flex-col gap-6 fade-in">
      {period && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm text-foreground">
          <CalendarRange className="h-4 w-4 text-lilac" />
          <span className="text-muted-foreground">Período do relatório:</span>
          <span className="font-medium">{period}</span>
        </div>
      )}

      {/* Sections of metric cards with variation */}
      {sections.map((section) => {
        const visible = section.keys
          .map((k) => defByKey[k])
          .filter((d): d is MetricDef => Boolean(d))
          .filter((d) => (data.metrics[d.key] ?? "").toString().trim().length > 0);
        if (visible.length === 0) return null;
        return (
          <section key={section.title} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {section.title}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((m) => {
                const cur = toNumber(data.metrics[m.key]);
                const prev = toNumber(data.previous_metrics?.[m.key]);
                return (
                  <div key={m.key} className="relative">
                    <MetricCard
                      label={m.label}
                      value={formatMetricValue(data.metrics[m.key], m.format)}
                      Icon={m.icon}
                    />
                    {hasPrevious && (data.previous_metrics?.[m.key] ?? "").trim() && (
                      <div className="absolute right-3 top-3">
                        <VariationBadge current={cur} previous={prev} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Time series line chart */}
      {seriesData.length > 1 && (
        <section className="glass rounded-2xl p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Evolução diária
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0 0 / 0.2)" />
                <XAxis dataKey="date" stroke="oklch(0.7 0 0)" tick={{ fontSize: 11 }} />
                <YAxis stroke="oklch(0.7 0 0)" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.18 0 0)",
                    border: "1px solid oklch(0.3 0 0)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {seriesKeys?.map((k, i) => (
                  <Line
                    key={k}
                    type="monotone"
                    dataKey={k}
                    name={defByKey[k]?.label ?? k}
                    stroke={PIE_COLORS[i % PIE_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pie chart of interactions */}
        {pieData.length >= 2 && (
          <section className="glass rounded-2xl p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Distribuição de interações
            </h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.18 0 0)",
                      border: "1px solid oklch(0.3 0 0)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => v.toLocaleString("pt-BR")}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Comparison bar chart */}
        {comparisonData.length >= 1 && (
          <section className="glass rounded-2xl p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Antes vs Depois
            </h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0 0 / 0.2)" />
                  <XAxis dataKey="name" stroke="oklch(0.7 0 0)" tick={{ fontSize: 10 }} />
                  <YAxis stroke="oklch(0.7 0 0)" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.18 0 0)",
                      border: "1px solid oklch(0.3 0 0)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => v.toLocaleString("pt-BR")}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Anterior" fill="oklch(0.5 0.05 280)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Atual" fill="oklch(0.62 0.22 305)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
      </div>

      {/* Radial gauges */}
      {gauges.length > 0 && (
        <section className="glass rounded-2xl p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Indicadores de performance
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gauges.map((g, i) => {
              const cap = g.format === "percent" ? 100 : Math.max(g.value * 1.5, 1);
              const fill = PIE_COLORS[i % PIE_COLORS.length];
              return (
                <div key={g.key} className="flex flex-col items-center">
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        innerRadius="60%"
                        outerRadius="100%"
                        data={[{ name: g.label, value: Math.min(g.value, cap), fill }]}
                        startAngle={210}
                        endAngle={-30}
                      >
                        <RadialBar background dataKey="value" cornerRadius={8} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="-mt-12 text-center">
                    <p className="text-2xl font-semibold text-foreground">
                      {formatMetricValue(g.value.toString(), g.format)}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {g.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
