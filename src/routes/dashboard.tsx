import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PortalHeader } from "@/components/PortalHeader";
import { PortalSidebar } from "@/components/PortalSidebar";
import { SOURCES, type ReportSource } from "@/lib/sources";
import { ExternalLink, FileWarning, Loader2 } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Leandro MAJR" },
      { name: "description", content: "Seus relatórios de performance em tempo real." },
    ],
  }),
  component: DashboardPage,
});

interface ReportRow {
  source: ReportSource;
  iframe_url: string;
}

function DashboardPage() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState<ReportSource>("overview");
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

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
      .select("source, iframe_url")
      .eq("client_id", user.id)
      .then(({ data }) => {
        if (cancelled) return;
        setReports((data ?? []) as ReportRow[]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const currentUrl = useMemo(
    () => reports.find((r) => r.source === active)?.iframe_url ?? null,
    [reports, active],
  );
  const currentMeta = SOURCES.find((s) => s.key === active)!;

  // Re-mount iframe when changing source for smooth transition
  useEffect(() => {
    setIframeKey((k) => k + 1);
  }, [active]);

  if (authLoading || !user || role === "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <PortalSidebar active={active} onChange={setActive} open={open} onClose={() => setOpen(false)} />

      <div className="flex min-h-screen flex-1 flex-col">
        <PortalHeader onMenuClick={() => setOpen(true)} showMenuButton />

        <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 fade-in">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Relatório
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {currentMeta.label}
              </h1>
            </div>
            {currentUrl && (
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir em nova aba
              </a>
            )}
          </div>

          <div
            key={iframeKey}
            className="glass relative flex flex-1 overflow-hidden rounded-2xl fade-in"
            style={{ minHeight: "calc(100vh - 12rem)" }}
          >
            {loading ? (
              <div className="m-auto flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-sm">Carregando relatório…</p>
              </div>
            ) : currentUrl ? (
              <iframe
                src={currentUrl}
                title={currentMeta.label}
                className="h-full w-full flex-1 border-0"
                allowFullScreen
                loading="lazy"
                sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"
              />
            ) : (
              <div className="m-auto max-w-sm px-6 text-center text-muted-foreground">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                  <FileWarning className="h-5 w-5 text-lilac" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Nenhum relatório configurado
                </p>
                <p className="mt-1 text-xs">
                  Seu gestor ainda não vinculou um link para <b>{currentMeta.label}</b>. Fale com o
                  suporte se isso for inesperado.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
