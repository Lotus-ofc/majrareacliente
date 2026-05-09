import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PortalHeader } from "@/components/PortalHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CalendarDays,
  Copy,
  FileText,
  KeyRound,
  Loader2,
  NotebookPen,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserCog,
  Wallet,
} from "lucide-react";
import { SOURCES, type ReportSource } from "@/lib/sources";
import { notifyClient } from "@/lib/notify-admin";
import { METRICS_BY_SOURCE } from "@/lib/metrics";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ManagePostsDialog } from "@/components/ManagePostsDialog";
import { ManageInvoicesDialog } from "@/components/ManageInvoicesDialog";
import { ManageEditorialDialog } from "@/components/ManageEditorialDialog";
import { NewsView } from "@/components/NewsView";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Leandro MAJR" },
      { name: "description", content: "Painel administrativo de clientes e relatórios." },
    ],
  }),
  component: AdminPage,
});

interface ClientRow {
  id: string;
  full_name: string;
  company: string | null;
  whatsapp_url: string | null;
}

interface ReportRow {
  source: ReportSource;
  iframe_url: string | null;
  metrics: Record<string, string> | null;
  pdf_path: string | null;
}

function AdminPage() {
  const { user, role, loading, session } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<ClientRow | null>(null);
  const [postsClient, setPostsClient] = useState<ClientRow | null>(null);
  const [editorialClient, setEditorialClient] = useState<ClientRow | null>(null);
  const [invoicesClient, setInvoicesClient] = useState<ClientRow | null>(null);
  const [resetClient, setResetClient] = useState<ClientRow | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (role !== "admin") navigate({ to: "/dashboard" });
  }, [user, role, loading, navigate]);

  const fetchClients = async () => {
    setLoadingList(true);
    // Admin RLS allows reading all profiles + all roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "client");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) {
      setClients([]);
      setLoadingList(false);
      return;
    }
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, company, whatsapp_url")
      .in("id", ids)
      .order("created_at", { ascending: false });
    setClients((profs ?? []) as ClientRow[]);
    setLoadingList(false);
  };

  useEffect(() => {
    if (role === "admin") void fetchClients();
  }, [role]);

  if (loading || !user || role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PortalHeader
        rightSlot={
          <span className="hidden items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-lilac sm:inline-flex">
            <ShieldCheck className="h-3 w-3" />
            Admin
          </span>
        }
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Tabs defaultValue="clients" className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-2 sm:w-auto sm:inline-flex">
            <TabsTrigger value="clients">Clientes</TabsTrigger>
            <TabsTrigger value="news">Novidades</TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="mt-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Painel
                </p>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Clientes
                </h1>
              </div>
              <CreateClientDialog onCreated={fetchClients} accessToken={session?.access_token ?? ""} />
            </div>

            <div className="mt-6 glass overflow-hidden rounded-2xl">
              {loadingList ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : clients.length === 0 ? (
                <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                  Nenhum cliente cadastrado ainda. Clique em <b className="text-foreground">Novo cliente</b>.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {clients.map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6"
                    >
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {c.full_name || "Cliente sem nome"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.company || "—"}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelected(c)}
                          className="border-primary/40 bg-primary/10 text-lilac hover:bg-primary/15"
                        >
                          <UserCog className="mr-2 h-4 w-4" />
                          Relatórios
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPostsClient(c)}
                          className="border-border bg-card/60 hover:bg-secondary"
                        >
                          <CalendarDays className="mr-2 h-4 w-4" />
                          Posts
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditorialClient(c)}
                          className="border-border bg-card/60 hover:bg-secondary"
                        >
                          <NotebookPen className="mr-2 h-4 w-4" />
                          Editorial
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setInvoicesClient(c)}
                          className="border-border bg-card/60 hover:bg-secondary"
                        >
                          <Wallet className="mr-2 h-4 w-4" />
                          Financeiro
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setResetClient(c)}
                          className="border-[oklch(0.78_0.14_55/0.4)] bg-[oklch(0.78_0.14_55/0.1)] text-[oklch(0.85_0.14_70)] hover:bg-[oklch(0.78_0.14_55/0.2)]"
                        >
                          <KeyRound className="mr-2 h-4 w-4" />
                          Resetar senha
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          <TabsContent value="news" className="mt-0">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Painel
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Novidades
              </h1>
            </div>
            <NewsView />
          </TabsContent>
        </Tabs>
      </main>

      {resetClient && (
        <ResetPasswordDialog
          client={resetClient}
          onClose={() => setResetClient(null)}
        />
      )}

      {selected && (
        <ManageReportsDialog
          client={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {postsClient && (
        <ManagePostsDialog
          clientId={postsClient.id}
          clientName={postsClient.full_name || postsClient.company || "Cliente"}
          onClose={() => setPostsClient(null)}
        />
      )}

      {editorialClient && (
        <ManageEditorialDialog
          clientId={editorialClient.id}
          clientName={editorialClient.full_name || editorialClient.company || "Cliente"}
          onClose={() => setEditorialClient(null)}
        />
      )}

      {invoicesClient && (
        <ManageInvoicesDialog
          clientId={invoicesClient.id}
          clientName={invoicesClient.full_name || invoicesClient.company || "Cliente"}
          onClose={() => setInvoicesClient(null)}
        />
      )}
    </div>
  );
}

function CreateClientDialog({
  onCreated,
  accessToken,
}: {
  onCreated: () => void;
  accessToken: string;
}) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);

  const reset = () => {
    setFullName("");
    setEmail("");
    setCompany("");
    setWhatsapp("");
    setResult(null);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-client", {
        body: {
          email,
          full_name: fullName,
          company: company || null,
          whatsapp_url: whatsapp || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult({ email: data.email, password: data.password });
      onCreated();
      toast.success("Cliente criado");
    } catch (e) {
      toast.error("Falha ao criar cliente", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  void accessToken; // supabase.functions.invoke uses session automatically

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-primary to-[oklch(0.55_0.22_305)] font-medium text-primary-foreground shadow-[0_10px_30px_-10px_oklch(0.42_0.22_305/0.7)]">
          <Plus className="mr-2 h-4 w-4" />
          Novo cliente
        </Button>
      </DialogTrigger>
      <DialogContent
        className="glass-strong sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Cadastrar novo cliente</DialogTitle>
          <DialogDescription>
            Uma senha temporária será gerada automaticamente.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-mint/30 bg-mint/10 p-4">
              <p className="text-xs uppercase tracking-wider text-mint">Credenciais geradas</p>
              <div className="mt-3 space-y-2 text-sm">
                <CredRow label="E-mail" value={result.email} />
                <CredRow label="Senha temporária" value={result.password} />
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Copie e envie ao cliente. Esta senha não será exibida novamente.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Concluir</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@empresa.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp (URL)</Label>
                <Input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="https://wa.me/55..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={submit}
                disabled={submitting || !email}
                className="w-full bg-gradient-to-r from-primary to-[oklch(0.55_0.22_305)]"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar cliente"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  client,
  onClose,
}: {
  client: ClientRow;
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);

  const reset = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { user_id: client.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult({ email: data.email, password: data.password });
      toast.success("Senha resetada com sucesso");
    } catch (e) {
      toast.error("Falha ao resetar senha", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="glass-strong sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Resetar senha</DialogTitle>
          <DialogDescription>
            Uma nova senha aleatória será gerada para{" "}
            <b className="text-foreground">{client.full_name || client.company || "este cliente"}</b>.
            A senha antiga deixará de funcionar imediatamente.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-mint/30 bg-mint/10 p-4">
              <p className="text-xs uppercase tracking-wider text-mint">Nova senha gerada</p>
              <div className="mt-3 space-y-2 text-sm">
                <CredRow label="E-mail" value={result.email} />
                <CredRow label="Nova senha" value={result.password} />
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Copie e envie ao cliente. Esta senha não será exibida novamente.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={onClose}>Concluir</Button>
            </DialogFooter>
          </div>
        ) : (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              onClick={reset}
              disabled={submitting}
              className="bg-gradient-to-r from-primary to-[oklch(0.55_0.22_305)] font-medium text-primary-foreground"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Gerar nova senha
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CredRow({ label, value }: { label: string; value: string }) {
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado`);
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-background/60 px-3 py-2">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate font-mono text-xs text-foreground">{value}</div>
      </div>
      <Button size="icon" variant="ghost" onClick={copy} aria-label={`Copiar ${label}`}>
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ManageReportsDialog({
  client,
  onClose,
}: {
  client: ClientRow;
  onClose: () => void;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [metrics, setMetrics] = useState<Record<string, Record<string, string>>>({});
  const [pdfPaths, setPdfPaths] = useState<Record<string, string | null>>({});
  const [parsingSource, setParsingSource] = useState<ReportSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("client_reports")
        .select("source, iframe_url, metrics, pdf_path")
        .eq("client_id", client.id);
      if (cancelled) return;
      const urlMap: Record<string, string> = {};
      const metricMap: Record<string, Record<string, string>> = {};
      const pdfMap: Record<string, string | null> = {};
      ((data ?? []) as unknown as ReportRow[]).forEach((r) => {
        urlMap[r.source] = r.iframe_url ?? "";
        metricMap[r.source] = (r.metrics ?? {}) as Record<string, string>;
        pdfMap[r.source] = r.pdf_path ?? null;
      });
      setUrls(urlMap);
      setMetrics(metricMap);
      setPdfPaths(pdfMap);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [client.id]);

  const setMetric = (source: string, key: string, value: string) => {
    setMetrics((prev) => ({
      ...prev,
      [source]: { ...(prev[source] ?? {}), [key]: value },
    }));
  };

  const handlePdfUpload = async (source: ReportSource, file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Envie um arquivo PDF");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("PDF muito grande (máx 25MB)");
      return;
    }
    setParsingSource(source);
    const path = `${client.id}/${source}.pdf`;
    try {
      const { error: upErr } = await supabase.storage
        .from("report-pdfs")
        .upload(path, file, { upsert: true, contentType: "application/pdf" });
      if (upErr) throw upErr;

      toast.info("PDF enviado. Lendo com IA…", { duration: 3000 });

      const { data, error } = await supabase.functions.invoke("parse-report-pdf", {
        body: { client_id: client.id, source, pdf_path: path },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const extracted = (data?.metrics ?? {}) as Record<string, string>;
      setMetrics((prev) => ({
        ...prev,
        [source]: { ...(prev[source] ?? {}), ...extracted },
      }));
      setPdfPaths((prev) => ({ ...prev, [source]: path }));
      toast.success(
        `IA extraiu ${data?.count ?? Object.keys(extracted).length} métrica(s). Revise e salve.`,
      );
    } catch (e) {
      toast.error("Falha ao processar PDF", { description: (e as Error).message });
    } finally {
      setParsingSource(null);
    }
  };

  const removePdf = async (source: ReportSource) => {
    const path = pdfPaths[source];
    if (!path) return;
    try {
      await supabase.storage.from("report-pdfs").remove([path]);
      await supabase
        .from("client_reports")
        .update({ pdf_path: null })
        .eq("client_id", client.id)
        .eq("source", source);
      setPdfPaths((prev) => ({ ...prev, [source]: null }));
      toast.success("PDF removido");
    } catch (e) {
      toast.error("Erro ao remover PDF", { description: (e as Error).message });
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const rows = SOURCES.map((s) => {
        const url = (urls[s.key] ?? "").trim();
        const sourceMetrics = metrics[s.key] ?? {};
        const cleanedMetrics: Record<string, string> = {};
        Object.entries(sourceMetrics).forEach(([k, v]) => {
          const trimmed = (v ?? "").toString().trim();
          if (trimmed) cleanedMetrics[k] = trimmed;
        });
        return {
          client_id: client.id,
          source: s.key,
          iframe_url: url,
          metrics: cleanedMetrics,
          pdf_path: pdfPaths[s.key] ?? null,
          hasContent:
            url.length > 0 ||
            Object.keys(cleanedMetrics).length > 0 ||
            !!pdfPaths[s.key],
        };
      });

      const toUpsert = rows
        .filter((r) => r.hasContent)
        .map(({ hasContent: _h, ...rest }) => rest);
      const cleared = rows.filter((r) => !r.hasContent).map((r) => r.source);

      if (cleared.length > 0) {
        await supabase
          .from("client_reports")
          .delete()
          .eq("client_id", client.id)
          .in("source", cleared);
      }

      if (toUpsert.length > 0) {
        const { getClientAgencyId } = await import("@/lib/agency");
        const agency_id = await getClientAgencyId(client.id);
        const withAgency = toUpsert.map((r) => ({ ...r, agency_id }));
        const { error } = await supabase
          .from("client_reports")
          .upsert(withAgency, { onConflict: "client_id,source" });
        if (error) throw error;
      }
      toast.success("Relatórios atualizados");
      if (toUpsert.length > 0) {
        void notifyClient({ clientId: client.id, event: "report.published" });
      }
      onClose();
    } catch (e) {
      toast.error("Erro ao salvar", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="glass-strong max-h-[90vh] sm:max-w-3xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Relatórios — {client.full_name || client.company}</DialogTitle>
          <DialogDescription>
            Preencha as métricas de cada fonte e (opcional) o link do relatório
            completo no mLabs.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue={SOURCES[0].key} className="w-full">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
              {SOURCES.map((s) => {
                const Icon = s.icon;
                return (
                  <TabsTrigger
                    key={s.key}
                    value={s.key}
                    className="data-[state=active]:bg-primary/15 data-[state=active]:text-lilac"
                  >
                    <Icon className="mr-1.5 h-3.5 w-3.5" />
                    {s.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <div className="mt-4 max-h-[55vh] overflow-y-auto pr-1">
              {SOURCES.map((s) => {
                const defs = METRICS_BY_SOURCE[s.key];
                const sourceMetrics = metrics[s.key] ?? {};
                return (
                  <TabsContent key={s.key} value={s.key} className="mt-0 space-y-4">
                    <PdfImportBlock
                      source={s.key}
                      pdfPath={pdfPaths[s.key] ?? null}
                      parsing={parsingSource === s.key}
                      onUpload={(file) => handlePdfUpload(s.key, file)}
                      onRemove={() => removePdf(s.key)}
                    />

                    <div className="rounded-lg border border-border bg-card/50 p-3">
                      <Label className="text-xs">URL do relatório completo (mLabs)</Label>
                      <Input
                        className="mt-2 font-mono text-xs"
                        placeholder="https://mla.bs/..."
                        value={urls[s.key] ?? ""}
                        onChange={(e) =>
                          setUrls((prev) => ({ ...prev, [s.key]: e.target.value }))
                        }
                      />
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        Aparecerá como botão "Abrir relatório completo" para o cliente.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {defs.map((m) => {
                        const Icon = m.icon;
                        return (
                          <div
                            key={m.key}
                            className="rounded-lg border border-border bg-card/50 p-3"
                          >
                            <Label className="flex items-center gap-2 text-xs">
                              <Icon className="h-3.5 w-3.5 text-lilac" />
                              {m.label}
                            </Label>
                            <Input
                              className="mt-2 text-sm"
                              placeholder={
                                m.format === "currency"
                                  ? "ex: 12500,00"
                                  : m.format === "percent"
                                    ? "ex: 4,75"
                                    : m.format === "number"
                                      ? "ex: 1450"
                                      : "ex: Instagram / Direct"
                              }
                              value={sourceMetrics[m.key] ?? ""}
                              onChange={(e) => setMetric(s.key, m.key, e.target.value)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                );
              })}
            </div>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-gradient-to-r from-primary to-[oklch(0.55_0.22_305)]"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PdfImportBlock({
  source,
  pdfPath,
  parsing,
  onUpload,
  onRemove,
}: {
  source: ReportSource;
  pdfPath: string | null;
  parsing: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputId = `pdf-input-${source}`;

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Label className="flex items-center gap-2 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-lilac" />
          Preencher métricas com IA (PDF do mLabs)
        </Label>
        {pdfPath && !parsing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Remover
          </Button>
        )}
      </div>

      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-4 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/10"
            : pdfPath
              ? "border-mint/40 bg-mint/5"
              : "border-border bg-background/40 hover:border-primary/50 hover:bg-primary/5"
        }`}
      >
        {parsing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-lilac" />
            <p className="text-xs text-muted-foreground">
              Lendo PDF e extraindo métricas com IA…
            </p>
          </>
        ) : pdfPath ? (
          <>
            <FileText className="h-5 w-5 text-mint" />
            <p className="text-xs font-medium text-foreground">PDF importado ✓</p>
            <p className="text-[11px] text-muted-foreground">
              Clique ou arraste outro PDF para reprocessar
            </p>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 text-lilac" />
            <p className="text-xs font-medium text-foreground">
              Arraste o PDF aqui ou clique para enviar
            </p>
            <p className="text-[11px] text-muted-foreground">
              A IA vai ler e preencher os campos abaixo automaticamente (máx 25MB)
            </p>
          </>
        )}
        <input
          id={inputId}
          type="file"
          accept="application/pdf"
          className="hidden"
          disabled={parsing}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
