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
import { Copy, Loader2, Plus, Save, ShieldCheck, UserCog } from "lucide-react";
import { SOURCES, type ReportSource } from "@/lib/sources";
import { METRICS_BY_SOURCE } from "@/lib/metrics";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  iframe_url: string;
}

function AdminPage() {
  const { user, role, loading, session } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<ClientRow | null>(null);

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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelected(c)}
                    className="border-primary/40 bg-primary/10 text-lilac hover:bg-primary/15"
                  >
                    <UserCog className="mr-2 h-4 w-4" />
                    Gerenciar relatórios
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {selected && (
        <ManageReportsDialog
          client={selected}
          onClose={() => setSelected(null)}
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
      <DialogContent className="glass-strong sm:max-w-md">
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
  const [reports, setReports] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("client_reports")
        .select("source, iframe_url")
        .eq("client_id", client.id);
      if (cancelled) return;
      const map: Record<string, string> = {};
      (data ?? []).forEach((r) => (map[r.source] = r.iframe_url));
      setReports(map);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [client.id]);

  const save = async () => {
    setSaving(true);
    try {
      const rows = SOURCES.map((s) => ({
        client_id: client.id,
        source: s.key,
        iframe_url: (reports[s.key] || "").trim(),
      })).filter((r) => r.iframe_url.length > 0);

      // Delete sources that were cleared
      const cleared = SOURCES.map((s) => s.key).filter(
        (k) => !(reports[k] && reports[k].trim().length > 0),
      );
      if (cleared.length > 0) {
        await supabase
          .from("client_reports")
          .delete()
          .eq("client_id", client.id)
          .in("source", cleared);
      }

      if (rows.length > 0) {
        const { error } = await supabase
          .from("client_reports")
          .upsert(rows, { onConflict: "client_id,source" });
        if (error) throw error;
      }
      toast.success("Relatórios atualizados");
      onClose();
    } catch (e) {
      toast.error("Erro ao salvar", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Relatórios — {client.full_name || client.company}</DialogTitle>
          <DialogDescription>
            Cole os links de incorporação (mLabs) para cada fonte de tráfego.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {SOURCES.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.key}
                  className="rounded-lg border border-border bg-card/50 p-3"
                >
                  <Label className="flex items-center gap-2 text-xs">
                    <Icon className="h-3.5 w-3.5 text-lilac" />
                    {s.label}
                  </Label>
                  <Input
                    className="mt-2 font-mono text-xs"
                    placeholder="https://app.mlabs.com.br/..."
                    value={reports[s.key] ?? ""}
                    onChange={(e) =>
                      setReports((prev) => ({ ...prev, [s.key]: e.target.value }))
                    }
                  />
                </div>
              );
            })}
          </div>
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
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (
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
