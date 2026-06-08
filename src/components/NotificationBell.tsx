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
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  "post.revision_requested": {
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

interface Props {
  onViewAll?: () => void;
}

export function NotificationBell({ onViewAll }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);

  const fetchItems = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, kind, title, body, url, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data ?? []) as NotificationRow[]);
  };

  useEffect(() => {
    void fetchItems();
    if (!user) return;
    const ch = supabase
      .channel(`notif-bell-${user.id}`, { config: { private: true } })
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
    setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at ?? new Date().toISOString() })));
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
  };

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read_at: new Date().toISOString() } : i)));
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-foreground hover:bg-secondary/60"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground shadow-[0_0_10px_oklch(0.42_0.22_305/0.8)]">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold text-foreground">Notificações</p>
            <p className="text-[11px] text-muted-foreground">
              {unread > 0 ? `${unread} não lida${unread > 1 ? "s" : ""}` : "Tudo em dia"}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={markAllRead}
            disabled={unread === 0}
            className="h-7 px-2 text-[11px]"
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" />
            Marcar lidas
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <Inbox className="h-4 w-4 text-lilac" />
            </div>
            <p className="text-sm font-medium text-foreground">Nada por aqui ainda</p>
            <p className="text-xs text-muted-foreground">
              Você verá aqui novos relatórios, posts, faturas e anotações.
            </p>
          </div>
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {items.map((n) => {
              const meta = KIND_META[n.kind] ?? { icon: Bell, cls: "text-lilac bg-primary/15 border-primary/40" };
              const Icon = meta.icon;
              return (
                <li
                  key={n.id}
                  onClick={() => !n.read_at && void markRead(n.id)}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-secondary/60",
                    !n.read_at && "bg-primary/5",
                  )}
                >
                  <span className={cn("mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border", meta.cls)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold leading-tight text-foreground">{n.title}</p>
                      <span className="flex-shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                  </div>
                  {!n.read_at && (
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {onViewAll && (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                setOpen(false);
                onViewAll();
              }}
            >
              Ver todas as novidades
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
