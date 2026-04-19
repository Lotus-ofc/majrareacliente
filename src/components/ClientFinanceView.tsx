import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  Wallet,
  QrCode,
  Copy,
  CheckCheck,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatBRL, formatDateBR, formatMonthLabel, isOverdue } from "@/lib/format";

interface Invoice {
  id: string;
  reference_month: string;
  amount_cents: number;
  due_date: string;
  status: "pending" | "paid" | "overdue";
  pix_key: string | null;
}

const STATUS_META: Record<Invoice["status"], { label: string; cls: string }> = {
  paid: {
    label: "Pago",
    cls: "bg-mint/15 text-mint border-mint/40",
  },
  pending: {
    label: "Pendente",
    cls: "bg-[oklch(0.78_0.14_55/0.18)] text-[oklch(0.85_0.14_70)] border-[oklch(0.78_0.14_55/0.4)]",
  },
  overdue: {
    label: "Atrasado",
    cls: "bg-[oklch(0.65_0.22_25/0.18)] text-[oklch(0.78_0.18_25)] border-[oklch(0.65_0.22_25/0.45)]",
  },
};

export function ClientFinanceView({ clientId }: { clientId: string }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Invoice | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("invoices")
        .select("id, reference_month, amount_cents, due_date, status, pix_key")
        .eq("client_id", clientId)
        .order("due_date", { ascending: false });
      if (cancelled) return;
      // Auto-derive overdue visual without mutating DB
      const list = ((data ?? []) as Invoice[]).map((inv) =>
        inv.status === "pending" && isOverdue(inv.due_date)
          ? { ...inv, status: "overdue" as const }
          : inv,
      );
      setInvoices(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (loading) {
    return (
      <div className="glass flex flex-1 items-center justify-center rounded-2xl py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="glass flex flex-1 items-center justify-center rounded-2xl py-24 fade-in">
        <div className="max-w-sm px-6 text-center text-muted-foreground">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <Wallet className="h-5 w-5 text-lilac" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Nenhuma fatura registrada
          </p>
          <p className="mt-1 text-xs">
            Suas mensalidades aparecerão aqui assim que forem geradas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="glass overflow-hidden rounded-2xl fade-in">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs uppercase tracking-wider">Mês de referência</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Valor</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Vencimento</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wider">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => {
              const meta = STATUS_META[inv.status];
              const canPay = inv.status === "pending" || inv.status === "overdue";
              return (
                <TableRow key={inv.id} className="border-border">
                  <TableCell className="py-4 text-sm font-medium text-foreground">
                    {formatMonthLabel(inv.reference_month)}
                  </TableCell>
                  <TableCell className="py-4 text-sm font-semibold text-foreground">
                    {formatBRL(inv.amount_cents)}
                  </TableCell>
                  <TableCell className="py-4 text-sm text-muted-foreground">
                    {formatDateBR(inv.due_date)}
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge className={cn("rounded-full border px-2.5 py-0.5 text-[11px]", meta.cls)}>
                      {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    {canPay ? (
                      <Button
                        size="sm"
                        onClick={() => setSelected(inv)}
                        className="bg-gradient-to-r from-primary to-[oklch(0.55_0.22_305)] text-primary-foreground shadow-[0_8px_24px_-10px_oklch(0.42_0.22_305/0.7)] transition-transform hover:scale-[1.02]"
                      >
                        <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                        Pagar via PIX
                      </Button>
                    ) : (
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        —
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <PixModal invoice={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function PixModal({
  invoice,
  onClose,
}: {
  invoice: Invoice | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const pixKey =
    invoice?.pix_key?.trim() || "leandro.majr@pix.com.br"; // mocked fallback

  useEffect(() => {
    if (!invoice) setCopied(false);
  }, [invoice]);

  const copyPix = async () => {
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopied(true);
      toast.success("Chave PIX copiada para a área de transferência");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <Dialog open={!!invoice} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-lilac" />
            Pagamento via PIX
          </DialogTitle>
          <DialogDescription>
            {invoice && (
              <>
                Fatura de{" "}
                <span className="font-medium text-foreground">
                  {formatMonthLabel(invoice.reference_month)}
                </span>{" "}
                · {formatBRL(invoice.amount_cents)}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 fade-in">
          {/* QR Code (genérico) */}
          <div className="flex justify-center">
            <div className="flex h-48 w-48 items-center justify-center rounded-xl border border-border bg-background p-3">
              <div
                className="grid h-full w-full grid-cols-12 grid-rows-12 gap-px"
                aria-label="QR Code genérico"
              >
                {Array.from({ length: 144 }).map((_, i) => {
                  // Pseudo-random pattern stable per index
                  const on = ((i * 73) ^ (i >> 2)) % 3 !== 0;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "rounded-[1px]",
                        on ? "bg-foreground" : "bg-transparent",
                      )}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <QrCode className="h-3 w-3" />
            Escaneie ou copie a chave abaixo
          </div>

          <div className="rounded-xl border border-border bg-card/70 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Chave PIX
            </div>
            <div className="mt-1 break-all font-mono text-sm text-foreground">
              {pixKey}
            </div>
          </div>

          <Button
            onClick={copyPix}
            className={cn(
              "w-full transition-all duration-300",
              copied
                ? "bg-mint text-mint-foreground"
                : "bg-gradient-to-r from-primary to-[oklch(0.55_0.22_305)] text-primary-foreground shadow-[0_10px_30px_-10px_oklch(0.42_0.22_305/0.7)] hover:scale-[1.01]",
            )}
          >
            {copied ? (
              <>
                <CheckCheck className="mr-2 h-4 w-4" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copiar Chave PIX
              </>
            )}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            Após o pagamento, o status será atualizado pelo seu gestor.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
