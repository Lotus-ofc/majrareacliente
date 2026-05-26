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
