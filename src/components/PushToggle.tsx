import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getCurrentSubscription,
  isPushSupported,
  notificationPermission,
  subscribePush,
  unsubscribePush,
} from "@/lib/push-client";

export function PushToggle({ userId }: { userId: string }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default",
  );

  useEffect(() => {
    const sup = isPushSupported();
    setSupported(sup);
    setPermission(notificationPermission());
    if (!sup) return;
    getCurrentSubscription().then((s) => setEnabled(!!s));
  }, []);

  if (!supported) {
    return (
      <div className="hidden items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-[11px] text-muted-foreground md:inline-flex">
        <BellOff className="h-3.5 w-3.5" />
        Push indisponível neste navegador
      </div>
    );
  }

  const toggle = async () => {
    setLoading(true);
    try {
      if (enabled) {
        await unsubscribePush();
        setEnabled(false);
        toast.success("Notificações desativadas");
      } else {
        await subscribePush(userId);
        setEnabled(true);
        setPermission(notificationPermission());
        toast.success("Notificações ativadas! Você será avisado a cada novidade.");
      }
    } catch (e) {
      toast.error("Não foi possível alterar notificações", {
        description: (e as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={toggle}
      size="sm"
      variant={enabled ? "secondary" : "outline"}
      disabled={loading || permission === "denied"}
      className="gap-2"
      title={
        permission === "denied"
          ? "Permissão de notificação bloqueada nas configurações do navegador"
          : enabled
            ? "Desativar notificações push"
            : "Receber notificações push no celular"
      }
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : enabled ? (
        <Bell className="h-4 w-4 text-mint" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {enabled ? "Notificações ativas" : "Ativar notificações"}
      </span>
    </Button>
  );
}
