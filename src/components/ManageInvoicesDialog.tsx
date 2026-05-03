import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL, formatDateBR, formatMonthLabel } from "@/lib/format";
import { notifyClient } from "@/lib/notify-admin";

type InvoiceStatus = "pending" | "paid" | "overdue";

interface Invoice {
  id: string;
  reference_month: string;
  amount_cents: number;
  due_date: string;
  status: InvoiceStatus;
  pix_key: string | null;
}

const STATUS_OPTIONS: Array<{ value: InvoiceStatus; label: string }> = [
  { value: "pending", label: "Pendente" },
  { value: "paid", label: "Pago" },
  { value: "overdue", label: "Atrasado" },
];

const STATUS_CLS: Record<InvoiceStatus, string> = {
  paid: "bg-mint/15 text-mint border-mint/40",
  pending:
    "bg-[oklch(0.78_0.14_55/0.18)] text-[oklch(0.85_0.14_70)] border-[oklch(0.78_0.14_55/0.4)]",
  overdue:
    "bg-[oklch(0.65_0.22_25/0.18)] text-[oklch(0.78_0.18_25)] border-[oklch(0.65_0.22_25/0.45)]",
};

interface FormState {
  reference_month: string; // "YYYY-MM"
  amount: string; // "1234,56"
  due_date: string;
  status: InvoiceStatus;
  pix_key: string;
}

function todayMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const emptyForm: FormState = {
  reference_month: todayMonth(),
  amount: "",
  due_date: new Date().toISOString().slice(0, 10),
  status: "pending",
  pix_key: "",
};

function parseAmountToCents(input: string): number {
  const normalized = input.replace(/\./g, "").replace(",", ".").trim();
  const n = Number(normalized);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function ManageInvoicesDialog({
  clientId,
  clientName,
  onClose,
}: {
  clientId: string;
  clientName: string;
  onClose: () => void;
}) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("invoices")
      .select("id, reference_month, amount_cents, due_date, status, pix_key")
      .eq("client_id", clientId)
      .order("due_date", { ascending: false });
    setInvoices((data ?? []) as Invoice[]);
    setLoading(false);
  };

  useEffect(() => {
    void fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const startEdit = (inv: Invoice) => {
    setEditingId(inv.id);
    setForm({
      reference_month: inv.reference_month,
      amount: (inv.amount_cents / 100).toFixed(2).replace(".", ","),
      due_date: inv.due_date,
      status: inv.status,
      pix_key: inv.pix_key ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const submit = async () => {
    const cents = parseAmountToCents(form.amount);
    if (cents <= 0) {
      toast.error("Informe um valor válido (ex: 1500,00)");
      return;
    }
    setSubmitting(true);
    const payload = {
      client_id: clientId,
      reference_month: form.reference_month,
      amount_cents: cents,
      due_date: form.due_date,
      status: form.status,
      pix_key: form.pix_key.trim() || null,
    };
    const previous = editingId ? invoices.find((i) => i.id === editingId) : null;
    const { error } = editingId
      ? await supabase.from("invoices").update(payload).eq("id", editingId)
      : await supabase.from("invoices").insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    toast.success(editingId ? "Fatura atualizada" : "Fatura criada");
    if (!editingId) {
      void notifyClient({ clientId, event: "invoice.created" });
    } else if (previous?.status !== "paid" && form.status === "paid") {
      void notifyClient({ clientId, event: "invoice.paid" });
    }
    cancelEdit();
    void fetchInvoices();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta fatura?")) return;
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir", { description: error.message });
      return;
    }
    toast.success("Fatura excluída");
    void fetchInvoices();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Financeiro — {clientName}</DialogTitle>
          <DialogDescription>
            Gerencie as faturas mensais. O cliente verá e poderá pagar via PIX.
          </DialogDescription>
        </DialogHeader>

        {/* Form */}
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {editingId ? "Editar fatura" : "Nova fatura"}
            </h3>
            {editingId && (
              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                <X className="mr-1 h-3.5 w-3.5" /> Cancelar edição
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Mês de referência</Label>
              <Input
                type="month"
                value={form.reference_month}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reference_month: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Valor (R$)</Label>
              <Input
                placeholder="1500,00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Vencimento</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as InvoiceStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs">Chave PIX (opcional, sobrescreve a padrão)</Label>
              <Input
                placeholder="ex: leandro.majr@pix.com.br"
                value={form.pix_key}
                onChange={(e) => setForm((f) => ({ ...f, pix_key: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              onClick={submit}
              disabled={submitting}
              className="bg-gradient-to-r from-primary to-[oklch(0.55_0.22_305)]"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingId ? (
                <>
                  <Check className="mr-2 h-4 w-4" /> Salvar alterações
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" /> Criar fatura
                </>
              )}
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-semibold">Faturas</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
              Nenhuma fatura criada ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {invoices.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {formatMonthLabel(inv.reference_month)}
                      </span>
                      <Badge
                        className={cn(
                          "rounded-full border px-2 py-0 text-[10px]",
                          STATUS_CLS[inv.status],
                        )}
                      >
                        {STATUS_OPTIONS.find((s) => s.value === inv.status)?.label}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {formatBRL(inv.amount_cents)}
                      </span>
                      <span>Vence em {formatDateBR(inv.due_date)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(inv)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(inv.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
