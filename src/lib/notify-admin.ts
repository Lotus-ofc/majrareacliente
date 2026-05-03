// Helper to trigger push notifications from the admin UI.
// Calls the send-push edge function which authenticates the caller as admin.
import { supabase } from "@/integrations/supabase/client";

export type PushEvent =
  | "post.created"
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
    url: "/dashboard?section=approval",
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

export async function notifyClient({ clientId, event, title, body, url }: NotifyArgs) {
  const copy = DEFAULT_COPY[event];
  try {
    await supabase.functions.invoke("send-push", {
      body: {
        client_id: clientId,
        title: title ?? copy.title,
        body: body ?? copy.body,
        url: url ?? copy.url,
        tag: event,
      },
    });
  } catch (e) {
    // Non-fatal: notifications shouldn't break the admin workflow
    console.warn("Push notification failed", e);
  }
}
