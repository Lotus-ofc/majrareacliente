// Helpers para disparar notificações push + registrar no feed "Novidades".
import { supabase } from "@/integrations/supabase/client";

export type PushEvent =
  | "post.created"
  | "post.caption_change"
  | "post.revision_requested"
  | "invoice.created"
  | "invoice.paid"
  | "editorial.note"
  | "report.published";

interface NotifyArgs {
  clientId: string;
  event: PushEvent;
  title?: string;
  body?: string;
  url?: string;
}

/**
 * Mensagens específicas por fonte de relatório, para que o cliente saiba
 * exatamente o que foi publicado (Instagram, Google, Meta, etc.).
 */
const REPORT_SOURCE_COPY: Record<
  string,
  { title: string; body: string }
> = {
  overview: {
    title: "📊 Visão geral atualizada",
    body: "Atualizamos o panorama geral dos seus resultados. Toque para conferir.",
  },
  ga4: {
    title: "📈 Relatório do Google Analytics publicado",
    body: "Novos dados de tráfego e comportamento do site (GA4) estão disponíveis.",
  },
  meta_ads: {
    title: "🟦 Relatório de Meta Ads publicado",
    body: "Atualizamos os resultados das suas campanhas no Facebook e Instagram (Meta Ads).",
  },
  google_ads: {
    title: "🔍 Relatório de Google Ads publicado",
    body: "Novos resultados das suas campanhas no Google Ads já estão no portal.",
  },
  tiktok_ads: {
    title: "🎵 Relatório de TikTok Ads publicado",
    body: "Atualizamos o desempenho das suas campanhas no TikTok Ads.",
  },
  instagram_organic: {
    title: "📸 Relatório do Instagram publicado",
    body: "Novos números do seu Instagram orgânico (alcance, seguidores e engajamento) estão disponíveis.",
  },
  tiktok_organic: {
    title: "🎬 Relatório do TikTok publicado",
    body: "Atualizamos os resultados do seu TikTok orgânico. Toque para conferir.",
  },
};

/** Retorna título e corpo específicos para uma fonte de relatório. */
export function reportSourceCopy(source: string): { title: string; body: string } {
  return (
    REPORT_SOURCE_COPY[source] ?? {
      title: "📊 Novo relatório publicado",
      body: "Um relatório foi atualizado. Acesse para conferir os números.",
    }
  );
}

const DEFAULT_COPY: Record<PushEvent, { title: string; body: string; url: string }> = {
  "post.created": {
    title: "Novo post para aprovação",
    body: "Um novo post foi adicionado ao seu calendário. Toque para revisar e aprovar.",
    url: "/dashboard?section=calendar",
  },
  "post.caption_change": {
    title: "Sugestão de alteração de legenda",
    body: "O cliente sugeriu uma alteração na legenda de um post.",
    url: "/admin",
  },
  "post.revision_requested": {
    title: "Solicitação de alteração em post",
    body: "O cliente pediu ajustes em um post pendente. Abra para revisar.",
    url: "/admin",
  },
  "invoice.created": {
    title: "Nova fatura disponível",
    body: "Uma nova fatura foi gerada. Confira os detalhes no portal.",
    url: "/dashboard?section=finance",
  },
  "invoice.paid": {
    title: "Pagamento confirmado",
    body: "Sua fatura foi marcada como paga. Obrigado!",
    url: "/dashboard?section=finance",
  },
  "editorial.note": {
    title: "Calendário editorial atualizado",
    body: "Uma nova anotação foi adicionada à sua agenda editorial.",
    url: "/dashboard?section=editorial",
  },
  "report.published": {
    title: "Novo relatório publicado",
    body: "Um relatório foi atualizado. Acesse para conferir os números.",
    url: "/dashboard?section=reports",
  },
};

async function recordNotifications(params: {
  userIds: string[];
  kind: PushEvent;
  title: string;
  body: string;
  url: string;
  clientId: string;
}) {
  if (params.userIds.length === 0) return;
  const rows = params.userIds.map((uid) => ({
    user_id: uid,
    kind: params.kind,
    title: params.title,
    body: params.body,
    url: params.url,
    client_id: params.clientId,
  }));
  await supabase.from("notifications").insert(rows);
}

async function sendPush(payload: {
  userIds: string[];
  title: string;
  body: string;
  url: string;
  tag: string;
}) {
  try {
    await supabase.functions.invoke("send-push", {
      body: {
        user_ids: payload.userIds,
        title: payload.title,
        body: payload.body,
        url: payload.url,
        tag: payload.tag,
      },
    });
  } catch (e) {
    console.warn("Push notification failed", e);
  }
}

/** Notifica o cliente (push + feed Novidades). */
export async function notifyClient({ clientId, event, title, body, url }: NotifyArgs) {
  const copy = DEFAULT_COPY[event];
  const t = title ?? copy.title;
  const b = body ?? copy.body;
  const u = url ?? copy.url;
  await Promise.all([
    sendPush({ userIds: [clientId], title: t, body: b, url: u, tag: event }),
    recordNotifications({
      userIds: [clientId],
      kind: event,
      title: t,
      body: b,
      url: u,
      clientId,
    }),
  ]);
}

/** Notifica TODOS os administradores (push + feed Novidades). */
export async function notifyAdmins({
  event,
  clientId,
  title,
  body,
  url,
}: {
  event: PushEvent;
  clientId: string;
  title?: string;
  body?: string;
  url?: string;
}) {
  const copy = DEFAULT_COPY[event];
  const { data: admins } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  const userIds = (admins ?? []).map((r) => r.user_id as string);
  if (userIds.length === 0) return;
  const t = title ?? copy.title;
  const b = body ?? copy.body;
  const u = url ?? copy.url;
  await Promise.all([
    sendPush({ userIds, title: t, body: b, url: u, tag: event }),
    recordNotifications({ userIds, kind: event, title: t, body: b, url: u, clientId }),
  ]);
}
