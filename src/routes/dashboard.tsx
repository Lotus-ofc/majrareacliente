import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PortalHeader } from "@/components/PortalHeader";
import { PortalSidebar } from "@/components/PortalSidebar";
import { ClientCalendarView } from "@/components/ClientCalendarView";
import { ClientEditorialView } from "@/components/ClientEditorialView";
import { ClientFinanceView } from "@/components/ClientFinanceView";
import { ReportBentoView } from "@/components/ReportBentoView";
import { NewsView } from "@/components/NewsView";
import { SOURCES, type ReportSource } from "@/lib/sources";
import { METRICS_BY_SOURCE } from "@/lib/metrics";
import { REPORT_BENTO } from "@/lib/report-bento";
import { PORTAL_SECTIONS, type PortalSection } from "@/lib/portal-sections";
import { ExternalLink, FileWarning, Loader2, Sparkles, History } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Leandro MAJR" },
      { name: "description", content: "Seu portal de relatórios, calendário e financeiro." },
    ],
  }),
  component: DashboardPage,
});

interface ReportRow {
  source: ReportSource;
  iframe_url: string | null;
  metrics: Record<string, string> | null;
  previous_metrics?: Record<string, string> | null;
  period_start?: string | null;
  period_end?: string | null;
  time_series?: Array<Record<string, string | number>> | null;
}

interface SnapshotRow {
  id: string;
  source: ReportSource;
  snapshot_date: string;
  period_start: string | null;
  period_end: string | null;
  dashboard_layout: {
    metrics?: Record<string, string>;
    previous_metrics?: Record<string, string>;
    time_series?: Array<Record<string, string | number>>;
  } | null;
  ai_analysis: string;
}

function DashboardPage() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<PortalSection>("news");
  const [active, setActive] = useState<ReportSource>("overview");
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [snapshotId, setSnapshotId] = useState<string>("live");
  const [profile, setProfile] = useState<{ full_name: string; company: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [showAi, setShowAi] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (role === "admin") {
      navigate({ to: "/admin" });
      return;
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("client_reports")
      .select(
        "source, iframe_url, metrics, previous_metrics, period_start, period_end, time_series",
      )
      .eq("client_id", user.id)
      .then(({ data }) => {
        if (cancelled) return;
        setReports((data ?? []) as unknown as ReportRow[]);
        setLoading(false);
      });
    supabase
      .from("report_snapshots")
      .select("id, source, snapshot_date, period_start, period_end, dashboard_layout, ai_analysis")
      .eq("client_id", user.id)
      .order("snapshot_date", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setSnapshots((data ?? []) as unknown as SnapshotRow[]);
      });
    supabase
      .from("profiles")
      .select("full_name, company")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setProfile(data);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Reset snapshot selection when changing source
  useEffect(() => {
    setSnapshotId("live");
    setShowAi(false);
  }, [active]);

  const liveReport = useMemo(
    () => reports.find((r) => r.source === active) ?? null,
    [reports, active],
  );
  const sourceSnapshots = useMemo(
    () => snapshots.filter((s) => s.source === active),
    [snapshots, active],
  );
  const activeSnapshot = useMemo(
    () => (snapshotId === "live" ? null : sourceSnapshots.find((s) => s.id === snapshotId) ?? null),
    [snapshotId, sourceSnapshots],
  );
  const current: {
    metrics: Record<string, string>;
    previous_metrics: Record<string, string> | null;
    period_start: string | null;
    period_end: string | null;
    time_series: Array<Record<string, string | number>> | null;
    ai_analysis: string;
  } | null = useMemo(() => {
    if (activeSnapshot) {
      const layout = activeSnapshot.dashboard_layout ?? {};
      return {
        metrics: layout.metrics ?? {},
        previous_metrics: layout.previous_metrics ?? null,
        period_start: activeSnapshot.period_start,
        period_end: activeSnapshot.period_end,
        time_series: layout.time_series ?? null,
        ai_analysis: activeSnapshot.ai_analysis ?? "",
      };
    }
    if (liveReport) {
      return {
        metrics: liveReport.metrics ?? {},
        previous_metrics: liveReport.previous_metrics ?? null,
        period_start: liveReport.period_start ?? null,
        period_end: liveReport.period_end ?? null,
        time_series: liveReport.time_series ?? null,
        ai_analysis: "",
      };
    }
    return null;
  }, [activeSnapshot, liveReport]);
  const currentMeta = SOURCES.find((s) => s.key === active)!;
  const sectionMeta = PORTAL_SECTIONS.find((s) => s.key === section)!;
  const metricDefs = METRICS_BY_SOURCE[active];
  const bentoConfig = REPORT_BENTO[active];
  const metricValues = current?.metrics ?? {};
  const fullReportUrl = liveReport?.iframe_url?.trim() || null;

  const hasAnyMetric = metricDefs.some(
    (m) => (metricValues[m.key] ?? "").toString().trim().length > 0,
  );

  if (authLoading || !user || role === "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Reports tab: lock to viewport on lg+ so the bento renders without scroll.
  // Other tabs scroll naturally.
  const isReports = section === "reports";

  return (
    <div className="flex min-h-screen lg:h-screen lg:overflow-hidden">
      <PortalSidebar
        section={section}
        onSectionChange={setSection}
        active={active}
        onChange={setActive}
        open={open}
        onClose={() => setOpen(false)}
      />

      <div className="flex min-h-screen flex-1 flex-col lg:h-screen lg:min-h-0">
        <PortalHeader onMenuClick={() => setOpen(true)} showMenuButton />

        <main
          className={
            isReports
              ? "flex flex-1 flex-col gap-3 p-3 sm:p-4 lg:min-h-0 lg:overflow-hidden"
              : "flex flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6"
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-3 fade-in lg:flex-shrink-0">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
                {section === "reports" ? "Relatório" : sectionMeta.label}
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-2xl">
                {section === "reports" ? currentMeta.label : sectionMeta.label}
              </h1>
            </div>
            {section === "reports" && fullReportUrl && (
              <a
                href={fullReportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-[oklch(0.55_0.22_305)] px-3.5 py-2 text-xs font-medium text-primary-foreground shadow-[0_10px_30px_-10px_oklch(0.42_0.22_305/0.7)] transition-transform hover:scale-[1.02]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir relatório completo
              </a>
            )}
          </div>

          {section === "reports" &&
            (loading ? (
              <div className="glass flex flex-1 items-center justify-center rounded-2xl py-24 lg:min-h-0">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="text-sm">Carregando métricas…</p>
                </div>
              </div>
            ) : hasAnyMetric && current ? (
              <div className="flex-1 lg:min-h-0 lg:overflow-y-auto lg:overflow-x-hidden">
                <ReportBentoView
                  data={{
                    metrics: metricValues,
                    previous_metrics: current.previous_metrics ?? null,
                    period_start: current.period_start ?? null,
                    period_end: current.period_end ?? null,
                    time_series: current.time_series ?? null,
                  }}
                  metricDefs={metricDefs}
                  config={bentoConfig}
                  sourceLabel={currentMeta.label}
                  SourceIcon={currentMeta.icon}
                />
              </div>
            ) : (
              <div className="glass flex flex-1 items-center justify-center rounded-2xl py-24 fade-in lg:min-h-0">
                <div className="max-w-sm px-6 text-center text-muted-foreground">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                    <FileWarning className="h-5 w-5 text-lilac" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Nenhuma métrica disponível
                  </p>
                  <p className="mt-1 text-xs">
                    Seu gestor ainda não preencheu os dados de <b>{currentMeta.label}</b>.
                    Fale com o suporte se isso for inesperado.
                  </p>
                </div>
              </div>
            ))}

          {section === "news" && <NewsView />}
          {section === "calendar" && (
            <ClientCalendarView
              clientId={user.id}
              clientName={profile?.company || profile?.full_name}
            />
          )}
          {section === "editorial" && <ClientEditorialView clientId={user.id} />}
          {section === "finance" && <ClientFinanceView clientId={user.id} />}
        </main>
      </div>
    </div>
  );
}
