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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { InstagramPreview, type PostFormat } from "./InstagramPreview";

interface Post {
  id: string;
  scheduled_date: string;
  title: string;
  image_url: string | null;
  media_urls: string[];
  post_format: PostFormat;
  caption: string;
  status: "pending" | "approved" | "published";
}

const STATUS_META: Record<Post["status"], { label: string; cls: string; dot: string }> = {
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

  const fetchPosts = async () => {
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
        status: p.status as Post["status"],
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
    toast.success("Post aprovado!");
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "approved" } : p)),
    );
    setSelectedPost((cur) => (cur && cur.id === id ? { ...cur, status: "approved" } : cur));
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
          {(Object.keys(STATUS_META) as Post["status"][]).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full", STATUS_META[s].dot)} />
              {STATUS_META[s].label}
            </span>
          ))}
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
                    const meta = STATUS_META[p.status];
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
            const meta = STATUS_META[p.status];
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
                  <Badge className={cn("mt-1 rounded-full px-2 py-0 text-[9px]", meta.cls)}>
                    {meta.label}
                  </Badge>
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
          onClose={() => setSelectedPost(null)}
          onApprove={() => approve(selectedPost.id)}
          approving={approvingId === selectedPost.id}
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
          size === "sm" ? "max-w-md" : "max-w-2xl",
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
            const meta = STATUS_META[p.status];
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
  onClose,
  onApprove,
  approving,
}: {
  post: Post;
  username: string;
  onClose: () => void;
  onApprove: () => void;
  approving: boolean;
}) {
  const meta = STATUS_META[post.status];
  const fmt = FORMAT_META[post.post_format];
  const FmtIcon = fmt.icon;

  return (
    <ModalShell onClose={onClose}>
      <div className="grid grid-cols-1 gap-0 md:grid-cols-[minmax(0,300px)_1fr]">
        {/* Media simulation */}
        <div className="border-b border-border bg-black/40 p-4 md:border-b-0 md:border-r">
          <InstagramPreview
            format={post.post_format}
            mediaUrls={post.media_urls}
            caption={post.caption}
            username={username}
          />
        </div>

        {/* Details */}
        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className="rounded-full border border-border bg-secondary/60 px-2 py-0 text-[10px] text-muted-foreground">
                <FmtIcon className="mr-1 h-2.5 w-2.5" />
                {fmt.label}
              </Badge>
              <Badge className={cn("rounded-full px-2 py-0 text-[10px]", meta.cls)}>
                {meta.label}
              </Badge>
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                {formatDateBR(post.scheduled_date)}
              </span>
            </div>
            <h2 className="text-xl font-semibold leading-tight text-foreground">
              {post.title || (
                <span className="italic text-muted-foreground">Sem título</span>
              )}
            </h2>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Legenda / Copy
            </p>
            <div className="max-h-[260px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-background/40 p-3 text-sm leading-relaxed text-foreground">
              {post.caption || (
                <span className="italic text-muted-foreground">Sem legenda</span>
              )}
            </div>
          </div>

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
          {post.status === "approved" && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-mint/10 py-2.5 text-sm font-medium text-mint">
              <Sparkles className="h-4 w-4" />
              Aguardando publicação
            </div>
          )}
          {post.status === "published" && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 py-2.5 text-sm font-medium text-lilac">
              <Check className="h-4 w-4" />
              Já publicado
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
