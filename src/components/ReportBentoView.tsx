import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import {
  CalendarRange,
  Minus,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  formatMetricValue,
  type MetricDef,
  type MetricFormat,
} from "@/lib/metrics";
import type { BentoConfig } from "@/lib/report-bento";
import { cn } from "@/lib/utils";

export interface ReportBentoData {
  metrics: Record<string, string>;
  previous_metrics?: Record<string, string> | null;
  period_start?: string | null;
  period_end?: string | null;
  time_series?: Array<Record<string, string | number>> | null;
}

interface Props {
  data: ReportBentoData;
  metricDefs: MetricDef[];
  config: BentoConfig;
  /** Visual title shown in the bento toolbar (e.g. "Instagram Orgânico"). */
  sourceLabel: string;
  /** Icon for the toolbar pill. */
  SourceIcon: LucideIcon;
}

const PALETTE = [
  "oklch(0.62 0.22 305)", // primary purple
  "oklch(0.82 0.12 305)", // lilac
  "oklch(0.96 0.06 175)", // mint
  "oklch(0.78 0.16 80)",  // amber
  "oklch(0.78 0.16 15)",  // rose
];

const GRID = "oklch(0.3 0 0 / 0.18)";
const AXIS = "oklch(0.65 0.01 285)";

function toNumber(raw: string | undefined | null): number {
  const value = (raw ?? "").trim();
  if (!value) return 0;
  const normalized = value
    .replace(/\s/g, "")
    .replace(/[^0-9,.-]/g, "")
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

function variation(current: number, previous: number): { pct: number; valid: boolean } {
  if (!Number.isFinite(previous) || previous === 0) return { pct: 0, valid: false };
  return { pct: ((current - previous) / Math.abs(previous)) * 100, valid: true };
}

function VariationBadge({ pct, valid }: { pct: number; valid: boolean }) {
  if (!valid) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-secondary/70 px-1.5 py-0.5 text-[9px] text-muted-foreground">
        <Minus className="h-2.5 w-2.5" /> —
      </span>
    );
  }
  const positive = pct >= 0;
  const Icon = pct === 0 ? Minus : positive ? TrendingUp : TrendingDown;
  const tone =
    pct === 0
      ? "bg-secondary/70 text-muted-foreground"
      : positive
        ? "bg-mint/15 text-mint"
        : "bg-destructive/15 text-destructive";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium", tone)}>
      <Icon className="h-2.5 w-2.5" />
      {pct > 0 ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}

const TOOLTIP_STYLE: React.CSSProperties = {
  background: "oklch(0.13 0.005 285 / 0.96)",
  border: "1px solid oklch(0.3 0 0 / 0.6)",
  borderRadius: 10,
  fontSize: 11,
  padding: "6px 10px",
  boxShadow: "0 8px 24px -10px oklch(0 0 0 / 0.6)",
};

export function ReportBentoView({
  data,
  metricDefs,
  config,
  sourceLabel,
  SourceIcon,
}: Props) {
  const defByKey = useMemo(
    () => Object.fromEntries(metricDefs.map((d) => [d.key, d])),
    [metricDefs],
  );

  const period = formatPeriod(data.period_start, data.period_end);
  const hasPrevious = !!(
    data.previous_metrics && Object.keys(data.previous_metrics).length > 0
  );

  const kpis = useMemo(() => {
    return config.kpiKeys
      .map((k) => {
        const def = defByKey[k];
        if (!def) return null;
        const raw = data.metrics[k];
        if (!raw || !raw.toString().trim()) return null;
        const cur = toNumber(raw);
        const prev = toNumber(data.previous_metrics?.[k]);
        return {
          key: k,
          def,
          raw,
          cur,
          prev,
          variation: variation(cur, prev),
        };
      })
      .filter(
        (
          x,
        ): x is {
          key: string;
          def: MetricDef;
          raw: string;
          cur: number;
          prev: number;
          variation: { pct: number; valid: boolean };
        } => x !== null,
      );
  }, [config.kpiKeys, defByKey, data.metrics, data.previous_metrics]);

  const seriesData = useMemo(() => {
    const ts = data.time_series ?? [];
    if (!Array.isArray(ts) || ts.length === 0 || !config.seriesKeys.length) return [];
    return ts.map((p) => {
      const out: Record<string, string | number> = { date: String(p.date ?? "") };
      config.seriesKeys.forEach((k) => {
        const v = p[k];
        out[k] =
          typeof v === "number" ? v : toNumber(typeof v === "string" ? v : "");
      });
      return out;
    });
  }, [data.time_series, config.seriesKeys]);

  const donutData = useMemo(() => {
    if (!config.donutKeys.length) return [];
    return config.donutKeys
      .map((k) => {
        const def = defByKey[k];
        if (!def) return null;
        const v = toNumber(data.metrics[k]);
        if (v <= 0) return null;
        return { name: def.label, key: k, value: v };
      })
      .filter((x): x is { name: string; key: string; value: number } => x !== null);
  }, [config.donutKeys, data.metrics, defByKey]);

  const donutTotal = useMemo(
    () => donutData.reduce((acc, d) => acc + d.value, 0),
    [donutData],
  );

  const comparisonData = useMemo(() => {
    if (!config.comparisonKeys.length || !hasPrevious) return [];
    return config.comparisonKeys
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
      .filter(
        (x): x is { name: string; Anterior: number; Atual: number } => x !== null,
      );
  }, [config.comparisonKeys, defByKey, data.metrics, data.previous_metrics, hasPrevious]);

  const gauges = useMemo(() => {
    return config.gaugeKeys
      .map((k) => {
        const def = defByKey[k];
        if (!def) return null;
        const raw = data.metrics[k];
        if (!raw || !raw.toString().trim()) return null;
        const v = toNumber(raw);
        return { key: k, label: def.label, value: v, format: def.format };
      })
      .filter(
        (x): x is { key: string; label: string; value: number; format: MetricFormat } =>
          x !== null,
      )
      .slice(0, 3);
  }, [config.gaugeKeys, data.metrics, defByKey]);

  const secondary = useMemo(() => {
    return config.secondaryKeys
      .map((k) => {
        const def = defByKey[k];
        if (!def) return null;
        const raw = data.metrics[k];
        if (!raw || !raw.toString().trim()) return null;
        return { key: k, def, raw };
      })
      .filter(
        (x): x is { key: string; def: MetricDef; raw: string } => x !== null,
      );
  }, [config.secondaryKeys, defByKey, data.metrics]);

  const hasSeries = seriesData.length > 1;
  const hasDonut = donutData.length >= 2;
  const hasComparison = comparisonData.length >= 1;
  const hasGauges = gauges.length > 0;

  const showAreaSlot = hasSeries;
  const showRightSlot = hasDonut || hasGauges;
  const showBottomSlot = hasComparison || secondary.length > 0;

  return (
    <div className="fade-in flex flex-col gap-3 lg:h-full lg:min-h-0">
      <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/15 text-lilac">
            <SourceIcon className="h-3.5 w-3.5" />
          </span>
          <span className="font-semibold text-foreground">{sourceLabel}</span>
          <span className="hidden text-muted-foreground sm:inline">·</span>
          <span className="hidden text-muted-foreground sm:inline">
            Painel de performance
          </span>
        </div>
        {period && (
          <div className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] text-muted-foreground">
            <CalendarRange className="h-3 w-3 text-lilac" />
            <span>Período</span>
            <span className="font-medium text-foreground">{period}</span>
          </div>
        )}
      </div>

      {kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:flex-shrink-0">
          {kpis.map((k) => (
            <KpiCard
              key={k.key}
              label={k.def.label}
              value={formatMetricValue(k.raw, k.def.format)}
              Icon={k.def.icon}
              variation={hasPrevious ? k.variation : { pct: 0, valid: false }}
            />
          ))}
        </div>
      )}

      <div
        className={cn(
          "grid gap-3 lg:flex-1 lg:min-h-0",
          showAreaSlot && showRightSlot
            ? "grid-cols-1 lg:grid-cols-12"
            : "grid-cols-1",
        )}
      >
        {showAreaSlot && (
          <div
            className={cn(
              "glass relative overflow-hidden rounded-2xl p-4",
              showRightSlot ? "lg:col-span-8" : "lg:col-span-12",
              "min-h-[260px] lg:min-h-0",
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {config.seriesTitle ?? "Evolução no tempo"}
                </p>
                <p className="text-xs text-foreground/70">
                  {config.seriesKeys.length} série{config.seriesKeys.length > 1 ? "s" : ""} no período
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {config.seriesKeys.map((k, i) => (
                  <span
                    key={k}
                    className="flex items-center gap-1 rounded-full border border-border bg-card/60 px-1.5 py-0.5 text-[9px] text-muted-foreground"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: PALETTE[i % PALETTE.length] }}
                    />
                    {defByKey[k]?.label ?? k}
                  </span>
                ))}
              </div>
            </div>
            <div className="h-[calc(100%-44px)] min-h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={seriesData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    {config.seriesKeys.map((k, i) => (
                      <linearGradient
                        key={k}
                        id={`grad-${k}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={PALETTE[i % PALETTE.length]}
                          stopOpacity={0.45}
                        />
                        <stop
                          offset="95%"
                          stopColor={PALETTE[i % PALETTE.length]}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke={AXIS}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke={AXIS}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  {config.seriesKeys.map((k, i) => (
                    <Area
                      key={k}
                      type="monotone"
                      dataKey={k}
                      name={defByKey[k]?.label ?? k}
                      stroke={PALETTE[i % PALETTE.length]}
                      strokeWidth={2}
                      fill={`url(#grad-${k})`}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {showRightSlot && (
          <div
            className={cn(
              "flex flex-col gap-3",
              showAreaSlot ? "lg:col-span-4" : "lg:col-span-12",
              "min-h-[260px] lg:min-h-0",
            )}
          >
            {hasDonut && (
              <div className="glass flex flex-1 flex-col rounded-2xl p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {config.donutTitle ?? "Composição"}
                </p>
                <div className="relative flex flex-1 items-center justify-center">
                  <div className="absolute inset-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius="62%"
                          outerRadius="92%"
                          paddingAngle={2}
                          stroke="none"
                        >
                          {donutData.map((_, i) => (
                            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(v: number) => v.toLocaleString("pt-BR")}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="pointer-events-none relative text-center">
                    <p className="text-lg font-semibold text-foreground">
                      {donutTotal.toLocaleString("pt-BR")}
                    </p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      total
                    </p>
                  </div>
                </div>
                <ul className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                  {donutData.map((d, i) => {
                    const pct = donutTotal > 0 ? (d.value / donutTotal) * 100 : 0;
                    return (
                      <li
                        key={d.key}
                        className="flex items-center gap-1.5 truncate text-muted-foreground"
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: PALETTE[i % PALETTE.length] }}
                        />
                        <span className="truncate text-foreground/80">{d.name}</span>
                        <span className="ml-auto text-muted-foreground">
                          {pct.toFixed(0)}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {hasGauges && (
              <div
                className={cn(
                  "glass rounded-2xl p-4",
                  hasDonut ? "" : "flex-1",
                )}
              >
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Indicadores
                </p>
                <div
                  className={cn(
                    "grid gap-2",
                    gauges.length === 1 ? "grid-cols-1" : gauges.length === 2 ? "grid-cols-2" : "grid-cols-3",
                  )}
                >
                  {gauges.map((g, i) => (
                    <RadialGauge
                      key={g.key}
                      value={g.value}
                      label={g.label}
                      format={g.format}
                      color={PALETTE[i % PALETTE.length]}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showBottomSlot && (
        <div className="grid grid-cols-1 gap-3 lg:flex-shrink-0 lg:grid-cols-12">
          {hasComparison && (
            <div
              className={cn(
                "glass rounded-2xl p-4",
                secondary.length > 0 ? "lg:col-span-7" : "lg:col-span-12",
              )}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Período atual × anterior
                </p>
                <div className="flex gap-2 text-[9px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: "oklch(0.5 0.05 280)" }}
                    />
                    Anterior
                  </span>
                  <span className="flex items-center gap-1">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: "oklch(0.62 0.22 305)" }}
                    />
                    Atual
                  </span>
                </div>
              </div>
              <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparisonData}
                    margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke={AXIS}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke={AXIS}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number) => v.toLocaleString("pt-BR")}
                    />
                    <Bar dataKey="Anterior" fill="oklch(0.5 0.05 280)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Atual" fill="oklch(0.62 0.22 305)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {secondary.length > 0 && (
            <div
              className={cn(
                "glass rounded-2xl p-4",
                hasComparison ? "lg:col-span-5" : "lg:col-span-12",
              )}
            >
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Outras métricas
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {secondary.map((s) => (
                  <SecondaryChip
                    key={s.key}
                    label={s.def.label}
                    value={formatMetricValue(s.raw, s.def.format)}
                    Icon={s.def.icon}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  Icon,
  variation,
}: {
  label: string;
  value: string;
  Icon: LucideIcon;
  variation: { pct: number; valid: boolean };
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-3.5 backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-card/70">
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-3xl transition-opacity group-hover:opacity-80" />
      <div className="relative flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-lilac">
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="relative mt-2 truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {value}
      </p>
      <div className="relative mt-1.5">
        <VariationBadge pct={variation.pct} valid={variation.valid} />
      </div>
    </div>
  );
}

function SecondaryChip({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: LucideIcon;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 px-2.5 py-2 transition-colors hover:border-primary/40">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card/60 text-lilac">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[9.5px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function RadialGauge({
  value,
  label,
  format,
  color,
}: {
  value: number;
  label: string;
  format: MetricFormat;
  color: string;
}) {
  const max = format === "percent" ? 100 : Math.max(value * 1.4, 1);
  const display = formatMetricValue(value.toString(), format);
  const data = [{ name: label, value: Math.min(value, max), fill: color }];
  return (
    <div className="relative flex flex-col items-center">
      <div className="relative h-20 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={data}
            innerRadius="68%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, max]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: "oklch(0.22 0.005 285)" }}
              dataKey="value"
              cornerRadius={6}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-[12px] font-semibold leading-tight text-foreground">
            {display}
          </span>
        </div>
      </div>
      <p className="mt-1 line-clamp-2 text-center text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
