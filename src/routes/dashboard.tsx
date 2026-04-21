import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PortalHeader } from "@/components/PortalHeader";
import { PortalSidebar } from "@/components/PortalSidebar";
import { MetricCard } from "@/components/MetricCard";
import { ClientCalendarView } from "@/components/ClientCalendarView";
import { ClientFinanceView } from "@/components/ClientFinanceView";
import { SocialReportView } from "@/components/SocialReportView";
import { SOURCES, type ReportSource } from "@/lib/sources";
import { METRICS_BY_SOURCE, formatMetricValue } from "@/lib/metrics";
import { PORTAL_SECTIONS, type PortalSection } from "@/lib/portal-sections";
import { ExternalLink, FileWarning, Loader2 } from "lucide-react";

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

function DashboardPage() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<PortalSection>("reports");
  const [active, setActive] = useState<ReportSource>("overview");
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

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
    return () => {
      cancelled = true;
    };
  }, [user]);

  const current = useMemo(
    () => reports.find((r) => r.source === active) ?? null,
    [reports, active],
  );
  const currentMeta = SOURCES.find((s) => s.key === active)!;
  const sectionMeta = PORTAL_SECTIONS.find((s) => s.key === section)!;
  const metricDefs = METRICS_BY_SOURCE[active];
  const metricValues = current?.metrics ?? {};
  const fullReportUrl = current?.iframe_url?.trim() || null;

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

  return (
    <div className="flex min-h-screen">
      <PortalSidebar
        section={section}
        onSectionChange={setSection}
        active={active}
        onChange={setActive}
        open={open}
        onClose={() => setOpen(false)}
      />

      <div className="flex min-h-screen flex-1 flex-col">
        <PortalHeader onMenuClick={() => setOpen(true)} showMenuButton />

        <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 fade-in">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {section === "reports" ? "Relatório" : sectionMeta.label}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {section === "reports" ? currentMeta.label : sectionMeta.label}
              </h1>
            </div>
            {section === "reports" && fullReportUrl && (
              <a
                href={fullReportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-[oklch(0.55_0.22_305)] px-4 py-2.5 text-xs font-medium text-primary-foreground shadow-[0_10px_30px_-10px_oklch(0.42_0.22_305/0.7)] transition-transform hover:scale-[1.02]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir relatório completo
              </a>
            )}
          </div>

          {section === "reports" &&
            (loading ? (
              <div className="glass flex flex-1 items-center justify-center rounded-2xl py-24">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="text-sm">Carregando métricas…</p>
                </div>
              </div>
            ) : hasAnyMetric ? (
              <div className="grid grid-cols-1 gap-4 fade-in sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {metricDefs.map((m) => (
                  <MetricCard
                    key={m.key}
                    label={m.label}
                    value={formatMetricValue(metricValues[m.key], m.format)}
                    Icon={m.icon}
                  />
                ))}
              </div>
            ) : (
              <div className="glass flex flex-1 items-center justify-center rounded-2xl py-24 fade-in">
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

          {section === "calendar" && <ClientCalendarView clientId={user.id} />}
          {section === "finance" && <ClientFinanceView clientId={user.id} />}
        </main>
      </div>
    </div>
  );
}
