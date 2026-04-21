import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CalendarDays, Check, Sparkles, Layers, Square, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { InstagramPreview, type PostFormat } from "./InstagramPreview";

interface Post {
  id: string;
  scheduled_date: string;
  image_url: string | null;
  media_urls: string[];
  post_format: PostFormat;
  caption: string;
  status: "pending" | "approved" | "published";
}

const STATUS_META: Record<Post["status"], { label: string; cls: string }> = {
  pending: {
    label: "Pendente",
    cls: "bg-[oklch(0.78_0.14_55/0.18)] text-[oklch(0.85_0.14_70)] border border-[oklch(0.78_0.14_55/0.4)]",
  },
  approved: {
    label: "Aprovado",
    cls: "bg-mint/15 text-mint border border-mint/40",
  },
  published: {
    label: "Publicado",
    cls: "bg-primary/15 text-lilac border border-primary/40",
  },
};

const FORMAT_META: Record<PostFormat, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  single: { label: "Post", icon: Square },
  carousel: { label: "Carrossel", icon: Layers },
  reel: { label: "Reel", icon: Smartphone },
};

const COLUMNS: Array<{ key: Post["status"]; title: string }> = [
  { key: "pending", title: "Pendentes" },
  { key: "approved", title: "Aprovados" },
  { key: "published", title: "Publicados" },
];

export function ClientCalendarView({ clientId, clientName }: { clientId: string; clientName?: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("editorial_posts")
      .select("id, scheduled_date, image_url, media_urls, post_format, caption, status")
      .eq("client_id", clientId)
      .order("scheduled_date", { ascending: true });

    const normalized = (data ?? []).map((p) => {
      const mu = Array.isArray(p.media_urls)
        ? (p.media_urls as unknown[]).filter(
            (u): u is string => typeof u === "string" && u.length > 0,
          )
        : [];
      const finalMedia = mu.length > 0 ? mu : p.image_url ? [p.image_url] : [];
      return {
        id: p.id,
        scheduled_date: p.scheduled_date,
        image_url: p.image_url,
        media_urls: finalMedia,
        post_format: (p.post_format ?? "single") as PostFormat,
        caption: p.caption,
        status: p.status as Post["status"],
      };
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
  };

  if (loading) {
    return (
      <div className="glass flex flex-1 items-center justify-center rounded-2xl py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="glass flex flex-1 items-center justify-center rounded-2xl py-24 fade-in">
        <div className="max-w-sm px-6 text-center text-muted-foreground">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <CalendarDays className="h-5 w-5 text-lilac" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Nenhum post agendado
          </p>
          <p className="mt-1 text-xs">
            Seu gestor ainda não programou conteúdo. Em breve você verá os posts aqui para aprovar.
          </p>
        </div>
      </div>
    );
  }

  const username = clientName?.toLowerCase().replace(/\s+/g, "_") || "seu_perfil";

  return (
    <div className="grid grid-cols-1 gap-4 fade-in lg:grid-cols-3">
      {COLUMNS.map((col) => {
        const colPosts = posts.filter((p) => p.status === col.key);
        return (
          <div
            key={col.key}
            className="glass flex flex-col gap-4 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {col.title}
              </h3>
              <span className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {colPosts.length}
              </span>
            </div>

            <div className="space-y-6">
              {colPosts.length === 0 && (
                <p className="rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
                  Nada por aqui
                </p>
              )}
              {colPosts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  username={username}
                  onApprove={() => approve(p.id)}
                  approving={approvingId === p.id}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PostCard({
  post,
  username,
  onApprove,
  approving,
}: {
  post: Post;
  username: string;
  onApprove: () => void;
  approving: boolean;
}) {
  const meta = STATUS_META[post.status];
  const fmt = FORMAT_META[post.post_format];
  const FmtIcon = fmt.icon;

  return (
    <article className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          <CalendarDays className="h-3 w-3" />
          {formatDateBR(post.scheduled_date)}
        </div>
        <div className="flex items-center gap-1.5">
          <Badge className="rounded-full border border-border bg-secondary/60 px-2 py-0 text-[9px] text-muted-foreground">
            <FmtIcon className="mr-1 h-2.5 w-2.5" />
            {fmt.label}
          </Badge>
          <Badge className={cn("rounded-full px-2 py-0 text-[9px]", meta.cls)}>
            {meta.label}
          </Badge>
        </div>
      </div>

      <InstagramPreview
        format={post.post_format}
        mediaUrls={post.media_urls}
        caption={post.caption}
        username={username}
      />

      {post.status === "pending" && (
        <Button
          onClick={onApprove}
          disabled={approving}
          size="sm"
          className="w-full bg-gradient-to-r from-primary to-[oklch(0.55_0.22_305)] text-primary-foreground shadow-[0_8px_24px_-10px_oklch(0.42_0.22_305/0.7)] transition-transform hover:scale-[1.02]"
        >
          {approving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Aprovar Post
            </>
          )}
        </Button>
      )}
      {post.status === "approved" && (
        <div className="flex items-center justify-center gap-1.5 rounded-md bg-mint/10 py-1.5 text-[11px] font-medium text-mint">
          <Sparkles className="h-3 w-3" />
          Aguardando publicação
        </div>
      )}
    </article>
  );
}
