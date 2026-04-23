import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  NotebookPen,
  StickyNote,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Note {
  id: string;
  note_date: string;
  title: string;
  content: string;
  color: string;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const COLOR_STYLES: Record<string, { dot: string; chip: string; ring: string }> = {
  lilac: {
    dot: "bg-lilac",
    chip: "bg-primary/15 text-lilac border-primary/40",
    ring: "ring-primary/40",
  },
  mint: {
    dot: "bg-mint",
    chip: "bg-mint/15 text-mint border-mint/40",
    ring: "ring-mint/40",
  },
  amber: {
    dot: "bg-[oklch(0.85_0.14_70)]",
    chip:
      "bg-[oklch(0.78_0.14_55/0.18)] text-[oklch(0.85_0.14_70)] border-[oklch(0.78_0.14_55/0.4)]",
    ring: "ring-[oklch(0.78_0.14_55/0.5)]",
  },
  rose: {
    dot: "bg-[oklch(0.78_0.16_15)]",
    chip:
      "bg-[oklch(0.78_0.16_15/0.18)] text-[oklch(0.85_0.13_15)] border-[oklch(0.78_0.16_15/0.4)]",
    ring: "ring-[oklch(0.78_0.16_15/0.5)]",
  },
};

function styleFor(color: string) {
  return COLOR_STYLES[color] ?? COLOR_STYLES.lilac;
}

function toLocalDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function formatLongDate(s: string) {
  const d = parseISODate(s);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()].toLowerCase()}`;
}

export function ClientEditorialView({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("editorial_notes")
      .select("id, note_date, title, content, color")
      .eq("client_id", clientId)
      .order("note_date", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setNotes((data ?? []) as Note[]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const grid = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startWeekday = firstDayOfMonth.getDay();
    const startDate = new Date(year, month, 1 - startWeekday);
    const cells: Array<{ date: Date; key: string; inMonth: boolean }> = [];
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      cells.push({
        date: d,
        key: toLocalDateKey(d),
        inMonth: d.getMonth() === month,
      });
    }
    return cells;
  }, [cursor]);

  const notesByDay = useMemo(() => {
    const map = new Map<string, Note[]>();
    for (const n of notes) {
      const arr = map.get(n.note_date) ?? [];
      arr.push(n);
      map.set(n.note_date, arr);
    }
    return map;
  }, [notes]);

  const todayKey = toLocalDateKey(new Date());

  const monthNotes = notes
    .filter((n) => {
      const d = parseISODate(n.note_date);
      return d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth();
    })
    .sort((a, b) => a.note_date.localeCompare(b.note_date));

  const goPrev = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  const goNext = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  const goToday = () => {
    const n = new Date();
    setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
  };

  if (loading) {
    return (
      <div className="glass flex flex-1 items-center justify-center rounded-2xl py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedNotes = selectedDay ? notesByDay.get(selectedDay) ?? [] : [];

  return (
    <div className="space-y-4 fade-in">
      {/* Toolbar */}
      <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={goPrev} aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[180px] text-center">
            <p className="text-sm font-semibold capitalize text-foreground">
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {monthNotes.length} {monthNotes.length === 1 ? "anotação" : "anotações"} no mês
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={goNext} aria-label="Próximo mês">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={goToday} className="ml-2">
            Hoje
          </Button>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-[11px] text-muted-foreground">
          <NotebookPen className="h-3.5 w-3.5 text-lilac" />
          Agenda editorial — somente leitura
        </div>
      </div>

      {/* Desktop grid */}
      <div className="glass hidden overflow-hidden rounded-2xl md:block">
        <div className="grid grid-cols-7 border-b border-border bg-background/40">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((cell, idx) => {
            const dayNotes = notesByDay.get(cell.key) ?? [];
            const isToday = cell.key === todayKey;
            const isLastRow = idx >= 35;
            const hasNotes = dayNotes.length > 0;
            return (
              <button
                type="button"
                key={cell.key + idx}
                onClick={() => {
                  if (hasNotes) setSelectedDay(cell.key);
                }}
                disabled={!hasNotes}
                className={cn(
                  "relative flex min-h-[120px] flex-col gap-1.5 border-b border-r border-border p-2 text-left transition-colors",
                  cell.inMonth ? "bg-card" : "bg-card/30",
                  isLastRow && "border-b-0",
                  (idx + 1) % 7 === 0 && "border-r-0",
                  hasNotes && "cursor-pointer hover:bg-card/80",
                  isToday &&
                    "ring-1 ring-inset ring-primary/60 shadow-[inset_0_0_24px_-4px_oklch(0.42_0.22_305/0.45)]",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                      isToday
                        ? "bg-primary text-primary-foreground shadow-[0_0_18px_-2px_oklch(0.42_0.22_305/0.9)]"
                        : cell.inMonth
                          ? "text-foreground"
                          : "text-muted-foreground/50",
                    )}
                  >
                    {cell.date.getDate()}
                  </span>
                  {hasNotes && (
                    <span className="rounded-full border border-border bg-secondary/60 px-1.5 py-0 text-[9px] text-muted-foreground">
                      {dayNotes.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {dayNotes.slice(0, 3).map((n) => {
                    const s = styleFor(n.color);
                    return (
                      <div
                        key={n.id}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md border px-1.5 py-1 text-[10.5px] leading-tight",
                          s.chip,
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", s.dot)} />
                        <span className="flex-1 truncate font-medium">
                          {n.title || n.content.slice(0, 28) || "Anotação"}
                        </span>
                      </div>
                    );
                  })}
                  {dayNotes.length > 3 && (
                    <p className="px-1 text-[10px] text-muted-foreground">
                      +{dayNotes.length - 3} mais
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile list */}
      <div className="glass space-y-3 rounded-2xl p-3 md:hidden">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Anotações do mês
        </p>
        {monthNotes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/60 px-3 py-8 text-center text-xs text-muted-foreground">
            Sem anotações neste mês
          </p>
        ) : (
          monthNotes.map((n) => {
            const s = styleFor(n.color);
            const isToday = n.note_date === todayKey;
            return (
              <button
                type="button"
                key={n.id}
                onClick={() => setSelectedDay(n.note_date)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-card/70",
                  isToday && "ring-1 ring-primary/50",
                )}
              >
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary/60">
                  <span className="text-[10px] uppercase text-muted-foreground">
                    {WEEKDAYS[parseISODate(n.note_date).getDay()]}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {parseISODate(n.note_date).getDate()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", s.dot)} />
                    <p className="truncate text-sm font-medium text-foreground">
                      {n.title || "Anotação"}
                    </p>
                  </div>
                  {n.content && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                      {n.content}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Day notes modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
          <div className="glass-strong flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Calendário Editorial
                </p>
                <p className="truncate text-sm font-semibold capitalize text-foreground">
                  {formatLongDate(selectedDay)}
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                aria-label="Fechar"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {selectedNotes.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  Nenhuma anotação para este dia.
                </p>
              ) : (
                selectedNotes.map((n) => {
                  const s = styleFor(n.color);
                  return (
                    <article
                      key={n.id}
                      className={cn(
                        "rounded-xl border bg-card/60 p-4 ring-1",
                        s.ring,
                        "border-border",
                      )}
                    >
                      <header className="mb-2 flex items-center gap-2">
                        <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", s.chip)}>
                          <StickyNote className="h-3.5 w-3.5" />
                        </span>
                        <h3 className="flex-1 text-sm font-semibold text-foreground">
                          {n.title || "Anotação"}
                        </h3>
                      </header>
                      {n.content ? (
                        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">
                          {n.content}
                        </p>
                      ) : (
                        <p className="text-xs italic text-muted-foreground">
                          Sem descrição.
                        </p>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
