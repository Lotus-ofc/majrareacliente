import { useEffect, useRef, useState } from "react";
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
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
  UploadCloud,
  Film,
  ImageIcon,
  GripVertical,
  Layers,
  Square,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateBR } from "@/lib/format";
import { InstagramPreview, type PostFormat } from "./InstagramPreview";

type PostStatus = "pending" | "approved" | "published";

interface Post {
  id: string;
  scheduled_date: string;
  title: string;
  image_url: string | null;
  media_urls: string[];
  post_format: PostFormat;
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

const FORMAT_OPTIONS: Array<{
  value: PostFormat;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  ratio: string;
}> = [
  {
    value: "single",
    label: "Post único",
    hint: "Foto ou vídeo no feed (4:5 — 1080×1350)",
    icon: Square,
    ratio: "4:5",
  },
  {
    value: "carousel",
    label: "Carrossel",
    hint: "Várias mídias no feed (4:5 — 1080×1350)",
    icon: Layers,
    ratio: "4:5",
  },
  {
    value: "reel",
    label: "Reel",
    hint: "Vídeo vertical (9:16 — 1080×1920)",
    icon: Smartphone,
    ratio: "9:16",
  },
];

interface FormState {
  scheduled_date: string;
  title: string;
  media_urls: string[];
  post_format: PostFormat;
  caption: string;
  status: PostStatus;
}

const emptyForm: FormState = {
  scheduled_date: new Date().toISOString().slice(0, 10),
  title: "",
  media_urls: [],
  post_format: "single",
  caption: "",
  status: "pending",
};

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url);
}

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
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("editorial_posts")
      .select("id, scheduled_date, title, image_url, media_urls, post_format, caption, status")
      .eq("client_id", clientId)
      .order("scheduled_date", { ascending: true });
    const normalized = (data ?? []).map((p: { id: string; scheduled_date: string; title?: string | null; image_url: string | null; media_urls: unknown; post_format: string | null; caption: string; status: string }) => {
      const mu = Array.isArray(p.media_urls)
        ? (p.media_urls as unknown[]).filter(
            (u): u is string => typeof u === "string" && u.length > 0,
          )
        : [];
      const finalMedia = mu.length > 0 ? mu : p.image_url ? [p.image_url] : [];
      return {
        id: p.id,
        scheduled_date: p.scheduled_date,
        title: p.title ?? "",
        image_url: p.image_url,
        media_urls: finalMedia,
        post_format: (p.post_format ?? "single") as PostFormat,
        caption: p.caption,
        status: p.status as PostStatus,
      };
    });
    setPosts(normalized);
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
      title: p.title,
      media_urls: p.media_urls,
      post_format: p.post_format,
      caption: p.caption,
      status: p.status,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;

    // Format guards
    if (form.post_format === "reel") {
      const f = files[0];
      if (!f.type.startsWith("video/")) {
        toast.error("Reel precisa ser vídeo", {
          description: "Envie um arquivo de vídeo vertical (9:16).",
        });
        return;
      }
    }
    if (form.post_format === "single" && files.length > 1) {
      toast.warning("Apenas 1 mídia será usada", {
        description: 'Para várias mídias, troque o tipo para "Carrossel".',
      });
    }

    setUploading(true);
    const newUrls: string[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        toast.error(`Formato não suportado: ${file.name}`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`Arquivo muito grande: ${file.name}`, {
          description: "Limite de 50 MB.",
        });
        continue;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${clientId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("post-media")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
      if (error) {
        toast.error(`Falha em ${file.name}`, { description: error.message });
        continue;
      }
      const { data } = supabase.storage.from("post-media").getPublicUrl(path);
      newUrls.push(data.publicUrl);
    }
    setUploading(false);

    setForm((f) => {
      let next: string[];
      if (f.post_format === "carousel") {
        next = [...f.media_urls, ...newUrls].slice(0, 10); // IG limit
      } else {
        next = newUrls.slice(0, 1);
      }
      return { ...f, media_urls: next };
    });

    if (newUrls.length > 0) toast.success("Mídia enviada");
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length > 0) void uploadFiles(files);
  };

  const removeMediaAt = (i: number) => {
    setForm((f) => ({
      ...f,
      media_urls: f.media_urls.filter((_, idx) => idx !== i),
    }));
  };

  const moveMedia = (from: number, to: number) => {
    setForm((f) => {
      if (to < 0 || to >= f.media_urls.length) return f;
      const arr = [...f.media_urls];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return { ...f, media_urls: arr };
    });
  };

  const submit = async () => {
    if (form.media_urls.length === 0) {
      toast.error("Adicione ao menos uma mídia");
      return;
    }
    if (form.post_format === "carousel" && form.media_urls.length < 2) {
      toast.error("Carrossel precisa de pelo menos 2 mídias");
      return;
    }
    setSubmitting(true);
    const payload = {
      client_id: clientId,
      scheduled_date: form.scheduled_date,
      title: form.title,
      image_url: form.media_urls[0] ?? null, // legacy compat
      media_urls: form.media_urls,
      post_format: form.post_format,
      caption: form.caption,
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

  const canAddMore =
    form.post_format === "carousel"
      ? form.media_urls.length < 10
      : form.media_urls.length === 0;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Aprovação de Posts — {clientName}</DialogTitle>
          <DialogDescription>
            Crie posts únicos, carrosséis e reels. O cliente verá uma simulação fiel ao Instagram.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
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

            {/* Format selector */}
            <div className="mb-4 space-y-2">
              <Label className="text-xs">Tipo de publicação</Label>
              <div className="grid grid-cols-3 gap-2">
                {FORMAT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = form.post_format === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setForm((f) => {
                          let next = f.media_urls;
                          if (opt.value !== "carousel" && next.length > 1) {
                            next = next.slice(0, 1);
                          }
                          return { ...f, post_format: opt.value, media_urls: next };
                        });
                      }}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
                        active
                          ? "border-primary/70 bg-primary/10 shadow-[0_0_20px_-8px_oklch(0.42_0.22_305/0.5)]"
                          : "border-border bg-background/40 hover:border-primary/40",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            active ? "text-lilac" : "text-muted-foreground",
                          )}
                        />
                        <span className="text-sm font-medium">{opt.label}</span>
                        <span className="ml-auto rounded bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground">
                          {opt.ratio}
                        </span>
                      </div>
                      <p className="text-[11px] leading-tight text-muted-foreground">
                        {opt.hint}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-3 space-y-2">
              <Label className="text-xs">Título do post</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Ex: Lançamento da nova coleção"
                maxLength={120}
              />
              <p className="text-[11px] text-muted-foreground">
                Aparece como identificador rápido no calendário. {form.title.length}/120
              </p>
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

              {/* Drag & drop uploader */}
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">
                    Mídia{" "}
                    {form.post_format === "carousel" && (
                      <span className="text-muted-foreground">
                        ({form.media_urls.length}/10)
                      </span>
                    )}
                  </Label>
                  {form.post_format === "carousel" && (
                    <span className="text-[10px] text-muted-foreground">
                      Arraste o ícone ⋮⋮ para reordenar
                    </span>
                  )}
                </div>

                {/* Existing media list (carousel) */}
                {form.media_urls.length > 0 && (
                  <div
                    className={cn(
                      "grid gap-2",
                      form.post_format === "reel"
                        ? "grid-cols-1 sm:grid-cols-2"
                        : "grid-cols-3 sm:grid-cols-4",
                    )}
                  >
                    {form.media_urls.map((url, i) => {
                      const vid = isVideoUrl(url);
                      return (
                        <div
                          key={url + i}
                          className={cn(
                            "group relative overflow-hidden rounded-lg border border-border bg-secondary/40",
                            form.post_format === "reel"
                              ? "aspect-[9/16]"
                              : "aspect-[4/5]",
                          )}
                        >
                          {vid ? (
                            <video
                              src={url}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                            />
                          ) : (
                            <img
                              src={url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}
                          <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5 text-[9px] text-white">
                            {vid ? (
                              <Film className="h-2.5 w-2.5" />
                            ) : (
                              <ImageIcon className="h-2.5 w-2.5" />
                            )}
                            {i + 1}
                          </span>
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/70 px-1 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {form.post_format === "carousel" ? (
                              <div className="flex gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => moveMedia(i, i - 1)}
                                  disabled={i === 0}
                                  className="rounded bg-white/10 p-0.5 text-white disabled:opacity-30"
                                  title="Mover para a esquerda"
                                >
                                  <GripVertical className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <span />
                            )}
                            <button
                              type="button"
                              onClick={() => removeMediaAt(i)}
                              className="rounded bg-red-500/80 p-0.5 text-white"
                              title="Remover"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Drop zone */}
                {canAddMore && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-all",
                      dragOver
                        ? "border-primary/70 bg-primary/10"
                        : "border-border bg-background/40 hover:border-primary/40 hover:bg-secondary/40",
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={
                        form.post_format === "reel" ? "video/*" : "image/*,video/*"
                      }
                      multiple={form.post_format === "carousel"}
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (files.length > 0) void uploadFiles(files);
                        e.target.value = "";
                      }}
                    />
                    {uploading ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin text-lilac" />
                        <p className="text-xs text-muted-foreground">Enviando…</p>
                      </>
                    ) : (
                      <>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-lilac">
                          <UploadCloud className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {form.media_urls.length === 0
                            ? "Arraste e solte aqui"
                            : "Adicionar mais"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {form.post_format === "reel"
                            ? "Apenas vídeo vertical (9:16)"
                            : form.post_format === "carousel"
                              ? "Selecione múltiplos arquivos (até 10)"
                              : "Imagem ou vídeo (até 50 MB)"}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs">Legenda</Label>
                <Textarea
                  rows={6}
                  value={form.caption}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, caption: e.target.value }))
                  }
                  placeholder="Texto que será publicado…&#10;&#10;As quebras de linha são preservadas."
                  className="whitespace-pre-wrap"
                />
                <p className="text-[11px] text-muted-foreground">
                  Use Enter para criar quebras de linha — elas aparecerão exatamente assim para o cliente.
                </p>
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <Button
                onClick={submit}
                disabled={submitting || uploading || !form.scheduled_date}
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

          {/* Live preview */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Pré-visualização Instagram
            </Label>
            <div className="rounded-xl border border-border bg-gradient-to-br from-zinc-900 to-zinc-950 p-4">
              <InstagramPreview
                format={form.post_format}
                mediaUrls={form.media_urls}
                caption={form.caption}
                username={clientName.toLowerCase().replace(/\s+/g, "_") || "cliente"}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              É exatamente assim que o cliente verá o post para aprovação.
            </p>
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
              {posts.map((p) => {
                const cover = p.media_urls[0] ?? p.image_url;
                const isVid = cover ? isVideoUrl(cover) : false;
                const fmt = FORMAT_OPTIONS.find((o) => o.value === p.post_format);
                const FmtIcon = fmt?.icon ?? Square;
                return (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card/50 p-3"
                  >
                    <div className="flex min-w-0 flex-1 gap-3">
                      {cover ? (
                        isVid ? (
                          <video
                            src={cover}
                            className="h-14 w-14 flex-shrink-0 rounded-md object-cover"
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={cover}
                            alt=""
                            className="h-14 w-14 flex-shrink-0 rounded-md object-cover"
                          />
                        )
                      ) : (
                        <div className="h-14 w-14 flex-shrink-0 rounded-md bg-secondary" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
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
                          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2 py-0 text-[10px] text-muted-foreground">
                            <FmtIcon className="h-3 w-3" />
                            {fmt?.label}
                            {p.post_format === "carousel" && (
                              <span>· {p.media_urls.length}</span>
                            )}
                          </span>
                        </div>
                        {p.title && (
                          <p className="mt-1 truncate text-sm font-semibold text-foreground">
                            {p.title}
                          </p>
                        )}
                        <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-foreground/90">
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
                );
              })}
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
