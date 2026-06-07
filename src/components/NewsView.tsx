import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  Bell,
  CheckCheck,
  CalendarDays,
  Wallet,
  NotebookPen,
  BarChart3,
  MessageSquareWarning,
  Loader2,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NotificationRow {
  id: string;
  kind: string;
  title: string;
  body: string;
  url: string;
  read_at: string | null;
  created_at: string;
}

const KIND_META: Record<string, { icon: typeof Bell; cls: string }> = {
  "post.created": { icon: CalendarDays, cls: "text-lilac bg-primary/15 border-primary/40" },
  "post.caption_change": {
    icon: MessageSquareWarning,
    cls: "text-[oklch(0.85_0.14_70)] bg-[oklch(0.78_0.14_55/0.18)] border-[oklch(0.78_0.14_55/0.4)]",
  },
  "invoice.created": { icon: Wallet, cls: "text-lilac bg-primary/15 border-primary/40" },
  "invoice.paid": { icon: Wallet, cls: "text-mint bg-mint/15 border-mint/40" },
  "editorial.note": { icon: NotebookPen, cls: "text-lilac bg-primary/15 border-primary/40" },
  "report.published": { icon: BarChart3, cls: "text-lilac bg-primary/15 border-primary/40" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function NewsView() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, kind, title, body, url, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data ?? []) as NotificationRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void fetchItems();
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`, { config: { private: true } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void fetchItems(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const unread = useMemo(() => items.filter((i) => !i.read_at).length, [items]);

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    void fetchItems();
  };

  const markRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read_at: new Date().toISOString() } : i)));
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-lilac">
            <Bell className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Feed de novidades</p>
            <p className="text-xs text-muted-foreground">
              {unread > 0 ? `${unread} não lida${unread > 1 ? "s" : ""}` : "Tudo em dia"}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={markAllRead}
          disabled={unread === 0}
          className="border-border bg-card/60"
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          Marcar todas como lidas
        </Button>
      </div>

      {loading ? (
        <div className="glass flex flex-1 items-center justify-center rounded-2xl py-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="glass flex flex-1 items-center justify-center rounded-2xl py-24">
          <div className="max-w-sm px-6 text-center text-muted-foreground">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <Inbox className="h-5 w-5 text-lilac" />
            </div>
            <p className="text-sm font-medium text-foreground">Nada por aqui ainda</p>
            <p className="mt-1 text-xs">
              Você verá aqui qualquer atualização: novos posts, faturas, anotações editoriais e relatórios.
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const meta = KIND_META[n.kind] ?? { icon: Bell, cls: "text-lilac bg-primary/15 border-primary/40" };
            const Icon = meta.icon;
            return (
              <li
                key={n.id}
                onClick={() => !n.read_at && void markRead(n.id)}
                className={cn(
                  "group flex cursor-pointer items-start gap-3 rounded-xl border bg-card/60 p-3 transition-colors hover:bg-secondary/60",
                  n.read_at ? "border-border" : "border-primary/40 shadow-[0_0_24px_-6px_oklch(0.42_0.22_305/0.4)]",
                )}
              >
                <span className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border", meta.cls)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    <span className="flex-shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                </div>
                {!n.read_at && (
                  <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-primary shadow-[0_0_10px_oklch(0.42_0.22_305/0.8)]" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
