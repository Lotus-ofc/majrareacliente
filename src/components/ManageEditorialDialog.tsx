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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, NotebookPen, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { notifyClient } from "@/lib/notify-admin";

interface Note {
  id: string;
  note_date: string;
  title: string;
  content: string;
  color: string;
}

interface Props {
  clientId: string;
  clientName: string;
  onClose: () => void;
}

const COLOR_OPTIONS: Array<{ value: string; label: string; cls: string }> = [
  { value: "lilac", label: "Roxo", cls: "bg-lilac" },
  { value: "mint", label: "Menta", cls: "bg-mint" },
  { value: "amber", label: "Âmbar", cls: "bg-[oklch(0.85_0.14_70)]" },
  { value: "rose", label: "Rosa", cls: "bg-[oklch(0.78_0.16_15)]" },
];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateBR(s: string) {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

export function ManageEditorialDialog({ clientId, clientName, onClose }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("editorial_notes")
      .select("id, note_date, title, content, color")
      .eq("client_id", clientId)
      .order("note_date", { ascending: false });
    setNotes((data ?? []) as Note[]);
    setLoading(false);
  };

  useEffect(() => {
    void fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta anotação?")) return;
    const { error } = await supabase.from("editorial_notes").delete().eq("id", id);
    if (error) {
      toast.error("Falha ao remover", { description: error.message });
      return;
    }
    toast.success("Anotação removida");
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="glass-strong flex max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b border-border/60 px-6 pb-4 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-lilac" />
            Calendário Editorial — {clientName}
          </DialogTitle>
          <DialogDescription>
            Anotações livres por data. O cliente pode visualizar (somente leitura).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          <Button
            onClick={() => setCreating(true)}
            className="w-full bg-gradient-to-r from-primary to-[oklch(0.55_0.22_305)] font-medium text-primary-foreground"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova anotação
          </Button>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 px-3 py-8 text-center text-xs text-muted-foreground">
              Nenhuma anotação ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {notes.map((n) => {
                const colorMeta = COLOR_OPTIONS.find((c) => c.value === n.color) ?? COLOR_OPTIONS[0];
                return (
                  <li
                    key={n.id}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card/60 p-3"
                  >
                    <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", colorMeta.cls)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {n.title || "Anotação"}
                        </p>
                        <span className="rounded-full border border-border bg-secondary/60 px-2 py-0 text-[10px] text-muted-foreground">
                          {formatDateBR(n.note_date)}
                        </span>
                      </div>
                      {n.content && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {n.content}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditing(n)}
                        aria-label="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(n.id)}
                        aria-label="Remover"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {(creating || editing) && (
          <NoteFormDialog
            clientId={clientId}
            note={editing}
            onClose={() => {
              setCreating(false);
              setEditing(null);
            }}
            onSaved={() => {
              setCreating(false);
              setEditing(null);
              void fetchNotes();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NoteFormDialog({
  clientId,
  note,
  onClose,
  onSaved,
}: {
  clientId: string;
  note: Note | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(note?.note_date ?? todayKey());
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [color, setColor] = useState(note?.color ?? "lilac");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!date) {
      toast.error("Informe a data");
      return;
    }
    setSaving(true);
    if (note) {
      const { error } = await supabase
        .from("editorial_notes")
        .update({ note_date: date, title, content, color })
        .eq("id", note.id);
      setSaving(false);
      if (error) {
        toast.error("Falha ao salvar", { description: error.message });
        return;
      }
      toast.success("Anotação atualizada");
    } else {
      const { getClientAgencyId } = await import("@/lib/agency");
      const agency_id = await getClientAgencyId(clientId);
      const { error } = await supabase.from("editorial_notes").insert({
        client_id: clientId,
        agency_id,
        note_date: date,
        title,
        content,
        color,
      });
      setSaving(false);
      if (error) {
        toast.error("Falha ao criar", { description: error.message });
        return;
      }
      toast.success("Anotação criada");
      void notifyClient({
        clientId,
        event: "editorial.note",
        title: "🗓️ Nova anotação no calendário editorial",
        body: title.trim()
          ? `"${title.trim()}" foi adicionada à sua agenda editorial${date ? ` para ${date}` : ""}.`
          : "Uma nova anotação foi adicionada à sua agenda editorial.",
      });
    }
    onSaved();
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
          <DialogTitle>{note ? "Editar anotação" : "Nova anotação"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reunião de pauta"
            />
          </div>
          <div className="space-y-2">
            <Label>Conteúdo</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Anote livremente o que precisar para esta data…"
              rows={6}
            />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  aria-label={c.label}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-transform",
                    c.cls,
                    color === c.value
                      ? "scale-110 border-foreground shadow-md"
                      : "border-transparent opacity-70 hover:opacity-100",
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-gradient-to-r from-primary to-[oklch(0.55_0.22_305)]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
