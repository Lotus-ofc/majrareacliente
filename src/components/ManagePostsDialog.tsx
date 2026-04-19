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
import { formatDateBR } from "@/lib/format";

type PostStatus = "pending" | "approved" | "published";

interface Post {
  id: string;
  scheduled_date: string;
  image_url: string | null;
  caption: string;
  status: PostStatus;
}

const STATUS_OPTIONS: Array<{ value: PostStatus; label: string }> = [
  { value: "pending", label: "Pendente" },
  { value: "approved", label: "Aprovado" },
  { value: "published", label: "Publicado" },
];

const STATUS_CLS: Record<PostStatus, string> = {
  pending:
    "bg-[oklch(0.78_0.14_55/0.18)] text-[oklch(0.85_0.14_70)] border-[oklch(0.78_0.14_55/0.4)]",
  approved: "bg-mint/15 text-mint border-mint/40",
  published: "bg-primary/15 text-lilac border-primary/40",
};

interface FormState {
  scheduled_date: string;
  image_url: string;
  caption: string;
  status: PostStatus;
}

const emptyForm: FormState = {
  scheduled_date: new Date().toISOString().slice(0, 10),
  image_url: "",
  caption: "",
  status: "pending",
};

export function ManagePostsDialog({
  clientId,
  clientName,
  onClose,
}: {
  clientId: string;
  clientName: string;
  onClose: () => void;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("editorial_posts")
      .select("id, scheduled_date, image_url, caption, status")
      .eq("client_id", clientId)
      .order("scheduled_date", { ascending: true });
    setPosts((data ?? []) as Post[]);
    setLoading(false);
  };

  useEffect(() => {
    void fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const startEdit = (p: Post) => {
    setEditingId(p.id);
    setForm({
      scheduled_date: p.scheduled_date,
      image_url: p.image_url ?? "",
      caption: p.caption,
      status: p.status,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const submit = async () => {
    setSubmitting(true);
    const payload = {
      client_id: clientId,
      scheduled_date: form.scheduled_date,
      image_url: form.image_url.trim() || null,
      caption: form.caption.trim(),
      status: form.status,
    };
    const { error } = editingId
      ? await supabase.from("editorial_posts").update(payload).eq("id", editingId)
      : await supabase.from("editorial_posts").insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    toast.success(editingId ? "Post atualizado" : "Post criado");
    cancelEdit();
    void fetchPosts();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este post?")) return;
    const { error } = await supabase.from("editorial_posts").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir", { description: error.message });
      return;
    }
    toast.success("Post excluído");
    void fetchPosts();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Calendário Editorial — {clientName}</DialogTitle>
          <DialogDescription>
            Crie e edite os posts. O cliente poderá aprovar os pendentes.
          </DialogDescription>
        </DialogHeader>

        {/* Form */}
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {editingId ? "Editar post" : "Novo post"}
            </h3>
            {editingId && (
              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                <X className="mr-1 h-3.5 w-3.5" /> Cancelar edição
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Data programada</Label>
              <Input
                type="date"
                value={form.scheduled_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, scheduled_date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as PostStatus }))
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
              <Label className="text-xs">URL da imagem (opcional)</Label>
              <Input
                placeholder="https://..."
                value={form.image_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, image_url: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs">Legenda</Label>
              <Textarea
                rows={4}
                value={form.caption}
                onChange={(e) =>
                  setForm((f) => ({ ...f, caption: e.target.value }))
                }
                placeholder="Texto que será publicado…"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              onClick={submit}
              disabled={submitting || !form.scheduled_date}
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
                  <Plus className="mr-2 h-4 w-4" /> Criar post
                </>
              )}
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-semibold">Posts agendados</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
              Nenhum post criado ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {posts.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card/50 p-3"
                >
                  <div className="flex min-w-0 flex-1 gap-3">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt=""
                        className="h-14 w-14 flex-shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-14 w-14 flex-shrink-0 rounded-md bg-secondary" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDateBR(p.scheduled_date)}
                        </span>
                        <Badge
                          className={cn(
                            "rounded-full border px-2 py-0 text-[10px]",
                            STATUS_CLS[p.status],
                          )}
                        >
                          {STATUS_OPTIONS.find((s) => s.value === p.status)?.label}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-foreground/90">
                        {p.caption || (
                          <span className="italic text-muted-foreground">Sem legenda</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(p.id)}
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
