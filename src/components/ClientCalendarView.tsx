import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  CalendarDays,
  Check,
  Sparkles,
  Layers,
  Square,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Pencil,
  Send,
  AlertCircle,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { InstagramPreview, type PostFormat } from "./InstagramPreview";
import { formatTimeBR, getDisplayStatus, type RawPostStatus } from "@/lib/post-status";
import { notifyAdmins } from "@/lib/notify-admin";

type CaptionChangeStatus = "none" | "pending" | "rejected";

interface Post {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  title: string;
  image_url: string | null;
  media_urls: string[];
  post_format: PostFormat;
  caption: string;
  pending_caption: string | null;
  caption_change_status: CaptionChangeStatus;
  status: RawPostStatus;
  revision_requested: boolean;
  revision_note: string | null;
}

const STATUS_META: Record<RawPostStatus, { label: string; cls: string; dot: string }> = {
  pending: {
    label: "Em Aprovação",
    cls: "bg-[oklch(0.78_0.14_55/0.18)] text-[oklch(0.85_0.14_70)] border border-[oklch(0.78_0.14_55/0.4)]",
    dot: "bg-[oklch(0.85_0.14_70)]",
  },
  approved: {
    label: "Agendado",
    cls: "bg-mint/15 text-mint border border-mint/40",
    dot: "bg-mint",
  },
  published: {
    label: "Publicado",
    cls: "bg-primary/15 text-lilac border border-primary/40",
    dot: "bg-lilac",
  },
};

const FORMAT_META: Record<PostFormat, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  single: { label: "Post", icon: Square },
  carousel: { label: "Carrossel", icon: Layers },
  reel: { label: "Reel", icon: Smartphone },
};

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

function toLocalDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(s: string) {
  // Supabase date columns come as YYYY-MM-DD — parse as local to avoid TZ shift
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function ClientCalendarView({ clientId, clientName }: { clientId: string; clientName?: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [centralOpen, setCentralOpen] = useState(false);
  // Tick every minute so "Publicado" auto-flips when the scheduled time passes
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("editorial_posts")
      .select(
        "id, scheduled_date, scheduled_time, title, image_url, media_urls, post_format, caption, pending_caption, caption_change_status, status, revision_requested, revision_note",
      )
      .eq("client_id", clientId)
      .order("scheduled_date", { ascending: true });

    const normalized = (data ?? []).map((p: {
      id: string;
      scheduled_date: string;
      scheduled_time?: string | null;
      title?: string | null;
      image_url: string | null;
      media_urls: unknown;
      post_format: string | null;
      caption: string;
      pending_caption?: string | null;
      caption_change_status?: string | null;
      status: string;
      revision_requested?: boolean | null;
      revision_note?: string | null;
    }) => {
      const mu = Array.isArray(p.media_urls)
        ? (p.media_urls as unknown[]).filter(
            (u): u is string => typeof u === "string" && u.length > 0,
          )
        : [];
      const finalMedia = mu.length > 0 ? mu : p.image_url ? [p.image_url] : [];
      return {
        id: p.id,
        scheduled_date: p.scheduled_date,
        scheduled_time: p.scheduled_time ?? "09:00:00",
        title: p.title ?? "",
        image_url: p.image_url,
        media_urls: finalMedia,
        post_format: (p.post_format ?? "single") as PostFormat,
        caption: p.caption,
        pending_caption: p.pending_caption ?? null,
        caption_change_status: (p.caption_change_status ?? "none") as CaptionChangeStatus,
        status: p.status as RawPostStatus,
        revision_requested: !!p.revision_requested,
        revision_note: p.revision_note ?? null,
      } as Post;
    });
    setPosts(normalized);
    setLoading(false);
  };

  useEffect(() => {
    void fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const approve = async (id: string) => {
    setApprovingId(id);
    const { error } = await supabase
      .from("editorial_posts")
      .update({ status: "approved" })
      .eq("id", id);
    setApprovingId(null);
    if (error) {
      toast.error("Falha ao aprovar", { description: error.message });
      return;
    }
    toast.success("Post aprovado! Agora está agendado.");
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "approved" } : p)),
    );
    setSelectedPost((cur) => (cur && cur.id === id ? { ...cur, status: "approved" } : cur));
  };

  const proposeCaption = async (id: string, newCaption: string) => {
    const { error } = await supabase
      .from("editorial_posts")
      .update({
        pending_caption: newCaption,
        caption_change_status: "pending",
      })
      .eq("id", id);
    if (error) {
      toast.error("Falha ao enviar sugestão", { description: error.message });
      return false;
    }
    toast.success("Sugestão enviada", {
      description: "Aguardando aprovação do administrador.",
    });
    void notifyAdmins({
      event: "post.caption_change",
      clientId,
      body: "O cliente sugeriu uma nova legenda para um post. Abra a aba Posts para revisar.",
    });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, pending_caption: newCaption, caption_change_status: "pending" }
          : p,
      ),
    );
    setSelectedPost((cur) =>
      cur && cur.id === id
        ? { ...cur, pending_caption: newCaption, caption_change_status: "pending" }
        : cur,
    );
    return true;
  };

  const requestRevision = async (id: string, note: string) => {
    const trimmed = note.trim();
    if (!trimmed) {
      toast.error("Descreva o que precisa ser alterado");
      return false;
    }
    const { error } = await supabase
      .from("editorial_posts")
      .update({ revision_requested: true, revision_note: trimmed })
      .eq("id", id);
    if (error) {
      toast.error("Falha ao solicitar alteração", { description: error.message });
      return false;
    }
    toast.success("Solicitação enviada", {
      description: "O administrador foi notificado e fará os ajustes.",
    });
    void notifyAdmins({
      event: "post.revision_requested",
      clientId,
      body: "O cliente solicitou alterações em um post pendente. Abra a aba Posts para revisar.",
    });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, revision_requested: true, revision_note: trimmed } : p,
      ),
    );
    setSelectedPost((cur) =>
      cur && cur.id === id
        ? { ...cur, revision_requested: true, revision_note: trimmed }
        : cur,
    );
    return true;
  };

  // Build month grid (6 rows x 7 cols)
  const grid = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startWeekday = firstDayOfMonth.getDay(); // 0=Sun
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

  const postsByDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of posts) {
      const arr = map.get(p.scheduled_date) ?? [];
      arr.push(p);
      map.set(p.scheduled_date, arr);
    }
    return map;
  }, [posts]);

  const todayKey = toLocalDateKey(new Date());
  const username = clientName?.toLowerCase().replace(/\s+/g, "_") || "seu_perfil";

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

  // Mobile: list view of posts grouped by day in current month
  const monthPosts = posts
    .filter((p) => {
      const d = parseISODate(p.scheduled_date);
      return d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth();
    })
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

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
              {posts.length} posts no total
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={goNext} aria-label="Próximo mês">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={goToday} className="ml-2">
            Hoje
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {(Object.keys(STATUS_META) as RawPostStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full", STATUS_META[s].dot)} />
              {STATUS_META[s].label}
            </span>
          ))}
          <Button
            size="sm"
            onClick={() => setCentralOpen(true)}
            className="ml-1 h-8 gap-1.5 bg-gradient-to-r from-primary to-[oklch(0.55_0.22_305)] px-3 text-[11px] text-primary-foreground shadow-[0_8px_24px_-10px_oklch(0.42_0.22_305/0.7)] transition-transform hover:scale-[1.02]"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Central de Posts
          </Button>
        </div>
      </div>

      {/* Desktop / tablet: full month grid */}
      <div className="glass hidden overflow-hidden rounded-2xl md:block">
        {/* Weekday header */}
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
        {/* Days grid */}
        <div className="grid grid-cols-7">
          {grid.map((cell, idx) => {
            const dayPosts = postsByDay.get(cell.key) ?? [];
            const isToday = cell.key === todayKey;
            const isLastRow = idx >= 35;
            return (
              <button
                type="button"
                key={cell.key + idx}
                onClick={() => {
                  if (dayPosts.length === 1) {
                    setSelectedPost(dayPosts[0]);
                  } else if (dayPosts.length > 1) {
                    setSelectedDay(cell.key);
                  }
                }}
                className={cn(
                  "relative flex min-h-[120px] flex-col gap-1.5 border-b border-r border-border p-2 text-left transition-colors",
                  // bg #121212 (card token)
                  cell.inMonth ? "bg-card" : "bg-card/30",
                  // remove bottom border on last row
                  isLastRow && "border-b-0",
                  // remove right border on last col
                  (idx + 1) % 7 === 0 && "border-r-0",
                  dayPosts.length > 0 && "hover:bg-card/80 cursor-pointer",
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
                  {dayPosts.length > 0 && (
                    <span className="rounded-full border border-border bg-secondary/60 px-1.5 py-0 text-[9px] text-muted-foreground">
                      {dayPosts.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {dayPosts.slice(0, 3).map((p) => {
                    const meta = STATUS_META[getDisplayStatus(p.status, p.scheduled_date, p.scheduled_time, now)];
                    const fmt = FORMAT_META[p.post_format];
                    const FmtIcon = fmt.icon;
                    return (
                      <div
                        key={p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPost(p);
                        }}
                        className={cn(
                          "group/post flex items-center gap-1.5 rounded-md border px-1.5 py-1 text-[10.5px] leading-tight transition-all hover:scale-[1.02] hover:shadow-md",
                          meta.cls,
                        )}
                      >
                        <FmtIcon className="h-2.5 w-2.5 shrink-0 opacity-80" />
                        <span className="shrink-0 font-mono text-[9.5px] opacity-70">
                          {formatTimeBR(p.scheduled_time)}
                        </span>
                        <span className="flex-1 truncate font-medium">
                          {p.title || p.caption.slice(0, 28) || "Sem título"}
                        </span>
                      </div>
                    );
                  })}
                  {dayPosts.length > 3 && (
                    <p className="px-1 text-[10px] text-muted-foreground">
                      +{dayPosts.length - 3} mais
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile: agenda list for current month */}
      <div className="glass space-y-3 rounded-2xl p-3 md:hidden">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Agenda do mês
        </p>
        {monthPosts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/60 px-3 py-8 text-center text-xs text-muted-foreground">
            Sem posts neste mês
          </p>
        ) : (
          monthPosts.map((p) => {
            const meta = STATUS_META[getDisplayStatus(p.status, p.scheduled_date, p.scheduled_time, now)];
            const fmt = FORMAT_META[p.post_format];
            const FmtIcon = fmt.icon;
            const isToday = p.scheduled_date === todayKey;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => setSelectedPost(p)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-card/70",
                  isToday && "ring-1 ring-primary/50",
                )}
              >
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary/60">
                  <span className="text-[10px] uppercase text-muted-foreground">
                    {WEEKDAYS[parseISODate(p.scheduled_date).getDay()]}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {parseISODate(p.scheduled_date).getDate()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <FmtIcon className="h-3 w-3 text-muted-foreground" />
                    <p className="truncate text-sm font-medium text-foreground">
                      {p.title || p.caption.slice(0, 40) || "Sem título"}
                    </p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge className={cn("rounded-full px-2 py-0 text-[9px]", meta.cls)}>
                      {meta.label}
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      {formatTimeBR(p.scheduled_time)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Modal: Day picker (when multiple posts on same day) */}
      {selectedDay && (
        <DayPostsModal
          dayKey={selectedDay}
          posts={postsByDay.get(selectedDay) ?? []}
          onClose={() => setSelectedDay(null)}
          onPick={(p) => {
            setSelectedDay(null);
            setSelectedPost(p);
          }}
        />
      )}

      {/* Modal: Post detail */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          username={username}
          now={now}
          onClose={() => setSelectedPost(null)}
          onApprove={() => approve(selectedPost.id)}
          onProposeCaption={(text) => proposeCaption(selectedPost.id, text)}
          onRequestRevision={(note) => requestRevision(selectedPost.id, note)}
          approving={approvingId === selectedPost.id}
        />
      )}

      {/* Modal: Central de Posts (tabs por status) */}
      {centralOpen && (
        <PostsCentralModal
          posts={posts}
          now={now}
          onClose={() => setCentralOpen(false)}
          onPick={(p) => {
            setCentralOpen(false);
            setSelectedPost(p);
          }}
        />
      )}
    </div>
  );
}

function ModalShell({
  children,
  onClose,
  size = "md",
}: {
  children: React.ReactNode;
  onClose: () => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in">
      {/* Backdrop with glass */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />
      <div
        className={cn(
          "glass-strong relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-2xl",
          size === "sm" ? "max-w-md" : "max-w-[480px]",
        )}
        style={{
          background:
            "linear-gradient(180deg, oklch(0.14 0.006 285 / 0.85), oklch(0.09 0.005 285 / 0.78))",
          boxShadow:
            "0 30px 80px -20px oklch(0.42 0.22 305 / 0.4), 0 0 0 1px oklch(1 0 0 / 0.05) inset",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 rounded-full bg-background/60 p-1.5 text-muted-foreground backdrop-blur transition-colors hover:bg-background hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

function DayPostsModal({
  dayKey,
  posts,
  onClose,
  onPick,
}: {
  dayKey: string;
  posts: Post[];
  onClose: () => void;
  onPick: (p: Post) => void;
}) {
  return (
    <ModalShell onClose={onClose} size="sm">
      <div className="space-y-3 p-5">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {formatDateBR(dayKey)}
          </p>
          <h3 className="text-lg font-semibold text-foreground">
            {posts.length} posts neste dia
          </h3>
        </div>
        <div className="space-y-2">
          {posts.map((p) => {
            const meta = STATUS_META[p.status]; // selection list — show raw stored status
            const fmt = FORMAT_META[p.post_format];
            const FmtIcon = fmt.icon;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick(p)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card/60 p-3 text-left transition-all hover:border-primary/50 hover:bg-card"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <FmtIcon className="h-4 w-4 text-lilac" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {p.title || p.caption.slice(0, 40) || "Sem título"}
                  </p>
                  <Badge className={cn("mt-1 rounded-full px-2 py-0 text-[9px]", meta.cls)}>
                    {meta.label}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
}

function PostDetailModal({
  post,
  username,
  now,
  onClose,
  onApprove,
  onProposeCaption,
  onRequestRevision,
  approving,
}: {
  post: Post;
  username: string;
  now: Date;
  onClose: () => void;
  onApprove: () => void;
  onProposeCaption: (text: string) => Promise<boolean>;
  onRequestRevision: (note: string) => Promise<boolean>;
  approving: boolean;
}) {
  const displayStatus = getDisplayStatus(post.status, post.scheduled_date, post.scheduled_time, now);
  const meta = STATUS_META[displayStatus];
  const fmt = FORMAT_META[post.post_format];
  const FmtIcon = fmt.icon;

  const [editing, setEditing] = useState(false);
  const [draftCaption, setDraftCaption] = useState(post.caption);
  const [submittingCaption, setSubmittingCaption] = useState(false);

  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionDraft, setRevisionDraft] = useState("");
  const [submittingRevision, setSubmittingRevision] = useState(false);

  // Sync draft when switching posts
  useEffect(() => {
    setDraftCaption(post.caption);
    setEditing(false);
    setRevisionOpen(false);
    setRevisionDraft("");
  }, [post.id, post.caption]);

  const captionPending = post.caption_change_status === "pending";
  const captionRejected = post.caption_change_status === "rejected";

  const submitRevision = async () => {
    setSubmittingRevision(true);
    const ok = await onRequestRevision(revisionDraft);
    setSubmittingRevision(false);
    if (ok) {
      setRevisionOpen(false);
      setRevisionDraft("");
    }
  };

  const submitCaption = async () => {
    if (draftCaption.trim() === post.caption.trim()) {
      toast.info("Nenhuma alteração detectada");
      return;
    }
    setSubmittingCaption(true);
    const ok = await onProposeCaption(draftCaption);
    setSubmittingCaption(false);
    if (ok) setEditing(false);
  };

  return (
    <ModalShell onClose={onClose}>
      <div className="flex flex-col">
        {/* Header compacto */}
        <div className="space-y-2 border-b border-border/60 px-5 pb-4 pt-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className="rounded-full border border-border bg-secondary/60 px-2 py-0 text-[10px] text-muted-foreground">
              <FmtIcon className="mr-1 h-2.5 w-2.5" />
              {fmt.label}
            </Badge>
            <Badge className={cn("rounded-full px-2 py-0 text-[10px]", meta.cls)}>
              {meta.label}
            </Badge>
            <span className="ml-auto inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {formatDateBR(post.scheduled_date)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTimeBR(post.scheduled_time)}
              </span>
            </span>
          </div>
          {post.title && (
            <h2 className="text-base font-semibold leading-tight text-foreground">
              {post.title}
            </h2>
          )}
        </div>

        {/* Simulação Instagram em destaque */}
        <div className="flex justify-center bg-black/50 px-4 py-5">
          <InstagramPreview
            format={post.post_format}
            mediaUrls={post.media_urls}
            caption={post.caption}
            username={username}
            className="w-full"
          />
        </div>

        {/* Botão de aprovação logo abaixo */}
        <div className="space-y-3 px-5 pb-5 pt-4">
          {post.status === "pending" && (
            <Button
              onClick={onApprove}
              disabled={approving}
              className="w-full bg-mint text-mint-foreground shadow-[0_10px_30px_-10px_oklch(0.96_0.06_175/0.7)] transition-transform hover:scale-[1.01] hover:bg-mint/90"
            >
              {approving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="mr-1.5 h-4 w-4" />
                  Aprovar Conteúdo
                </>
              )}
            </Button>
          )}
          {displayStatus === "approved" && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-mint/10 py-2.5 text-sm font-medium text-mint">
              <Sparkles className="h-4 w-4" />
              Agendado para {formatDateBR(post.scheduled_date)} às {formatTimeBR(post.scheduled_time)}
            </div>
          )}
          {displayStatus === "published" && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 py-2.5 text-sm font-medium text-lilac">
              <Check className="h-4 w-4" />
              Publicado
            </div>
          )}

          {/* Caption status banners */}
          {captionPending && (
            <div className="flex items-start gap-2 rounded-xl border border-[oklch(0.78_0.14_55/0.4)] bg-[oklch(0.78_0.14_55/0.12)] px-3 py-2.5 text-xs text-[oklch(0.85_0.14_70)]">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <p className="font-semibold">Sugestão de legenda enviada</p>
                <p className="opacity-80">
                  Aguardando o administrador revisar e aprovar a alteração.
                </p>
              </div>
            </div>
          )}
          {captionRejected && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
              <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <p className="font-semibold">Sugestão recusada</p>
                <p className="opacity-80">
                  O administrador não aprovou sua última sugestão. Você pode tentar novamente.
                </p>
              </div>
            </div>
          )}

          {/* Legenda — leitura + edição */}
          <div className="rounded-xl border border-border bg-background/40">
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Legenda
              </p>
              {!editing && !captionPending && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="mr-1 h-3 w-3" />
                  Sugerir alteração
                </Button>
              )}
            </div>
            {editing ? (
              <div className="space-y-2 px-3 py-3">
                <Textarea
                  rows={6}
                  value={draftCaption}
                  onChange={(e) => setDraftCaption(e.target.value)}
                  className="text-sm"
                  placeholder="Reescreva a legenda como você gostaria…"
                />
                <p className="text-[10.5px] text-muted-foreground">
                  Esta sugestão será enviada para aprovação do administrador. A legenda atual permanece visível até a aprovação.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(false);
                      setDraftCaption(post.caption);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={submitCaption}
                    disabled={submittingCaption}
                    className="bg-gradient-to-r from-primary to-[oklch(0.55_0.22_305)]"
                  >
                    {submittingCaption ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Send className="mr-1 h-3 w-3" />
                        Enviar para aprovação
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="max-h-[200px] overflow-y-auto whitespace-pre-wrap px-3 py-3 text-sm leading-relaxed text-foreground">
                {post.caption || (
                  <span className="italic text-muted-foreground">Sem legenda</span>
                )}
              </div>
            )}
            {/* Show pending suggestion preview for transparency */}
            {captionPending && post.pending_caption && !editing && (
              <div className="border-t border-border/60 bg-[oklch(0.78_0.14_55/0.06)] px-3 py-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[oklch(0.85_0.14_70)]">
                  Sua sugestão (em análise)
                </p>
                <p className="max-h-[140px] overflow-y-auto whitespace-pre-wrap text-[12.5px] leading-relaxed text-foreground/90">
                  {post.pending_caption}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function PostsCentralModal({
  posts,
  now,
  onClose,
  onPick,
}: {
  posts: Post[];
  now: Date;
  onClose: () => void;
  onPick: (p: Post) => void;
}) {
  const grouped = useMemo(() => {
    const out: Record<RawPostStatus, Post[]> = { pending: [], approved: [], published: [] };
    for (const p of posts) {
      const display = getDisplayStatus(p.status, p.scheduled_date, p.scheduled_time, now);
      out[display].push(p);
    }
    const byDateAsc = (a: Post, b: Post) =>
      `${a.scheduled_date} ${a.scheduled_time}`.localeCompare(`${b.scheduled_date} ${b.scheduled_time}`);
    const byDateDesc = (a: Post, b: Post) => -byDateAsc(a, b);
    out.pending.sort(byDateAsc);
    out.approved.sort(byDateAsc);
    out.published.sort(byDateDesc);
    return out;
  }, [posts, now]);

  const renderList = (list: Post[], emptyLabel: string) => {
    if (list.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-border/60 px-4 py-12 text-center text-xs text-muted-foreground">
          {emptyLabel}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {list.map((p) => {
          const display = getDisplayStatus(p.status, p.scheduled_date, p.scheduled_time, now);
          const meta = STATUS_META[display];
          const fmt = FORMAT_META[p.post_format];
          const FmtIcon = fmt.icon;
          const thumb = p.media_urls[0] ?? p.image_url;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p)}
              className="group flex items-stretch gap-3 rounded-xl border border-border bg-card/60 p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card hover:shadow-[0_12px_28px_-12px_oklch(0.42_0.22_305/0.5)]"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary/60">
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <FmtIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <span className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded-md bg-black/60 px-1 py-0.5 text-[8px] text-white backdrop-blur">
                  <FmtIcon className="h-2.5 w-2.5" />
                  {fmt.label}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {p.title || p.caption.slice(0, 42) || "Sem título"}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                  {p.caption || "—"}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge className={cn("rounded-full px-2 py-0 text-[9px]", meta.cls)}>
                    {meta.label}
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <CalendarDays className="h-2.5 w-2.5" />
                    {formatDateBR(p.scheduled_date)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {formatTimeBR(p.scheduled_time)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in">
      <div onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div
        className="glass-strong relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.14 0.006 285 / 0.9), oklch(0.09 0.005 285 / 0.82))",
          boxShadow:
            "0 30px 80px -20px oklch(0.42 0.22 305 / 0.4), 0 0 0 1px oklch(1 0 0 / 0.05) inset",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 rounded-full bg-background/60 p-1.5 text-muted-foreground backdrop-blur transition-colors hover:bg-background hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="border-b border-border/60 px-5 pb-4 pt-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Central de Posts
          </p>
          <h2 className="text-lg font-semibold text-foreground">
            Todos os posts agrupados por status
          </h2>
        </div>

        <Tabs defaultValue="pending" className="flex flex-1 flex-col overflow-hidden">
          <TabsList className="mx-5 mt-4 h-auto w-fit justify-start gap-1 bg-card/40 p-1">
            <TabsTrigger
              value="pending"
              className="gap-1.5 data-[state=active]:bg-[oklch(0.78_0.14_55/0.18)] data-[state=active]:text-[oklch(0.85_0.14_70)]"
            >
              <span className="h-2 w-2 rounded-full bg-[oklch(0.85_0.14_70)]" />
              Pendentes
              <span className="rounded-full bg-background/40 px-1.5 text-[10px]">
                {grouped.pending.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="approved"
              className="gap-1.5 data-[state=active]:bg-mint/15 data-[state=active]:text-mint"
            >
              <span className="h-2 w-2 rounded-full bg-mint" />
              Agendados
              <span className="rounded-full bg-background/40 px-1.5 text-[10px]">
                {grouped.approved.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="published"
              className="gap-1.5 data-[state=active]:bg-primary/15 data-[state=active]:text-lilac"
            >
              <span className="h-2 w-2 rounded-full bg-lilac" />
              Publicados
              <span className="rounded-full bg-background/40 px-1.5 text-[10px]">
                {grouped.published.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-5 pb-5 pt-3">
            <TabsContent value="pending" className="mt-0">
              {renderList(grouped.pending, "Nenhum post pendente de aprovação")}
            </TabsContent>
            <TabsContent value="approved" className="mt-0">
              {renderList(grouped.approved, "Nenhum post agendado no momento")}
            </TabsContent>
            <TabsContent value="published" className="mt-0">
              {renderList(grouped.published, "Ainda não há posts publicados")}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

