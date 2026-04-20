// Parse a report PDF using Lovable AI and return extracted metrics
// for a given report source. Admin-only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReportSource =
  | "overview"
  | "ga4"
  | "meta_ads"
  | "google_ads"
  | "tiktok_ads"
  | "instagram_organic"
  | "tiktok_organic";

// Mirror of src/lib/metrics.ts (kept in sync manually)
const METRICS: Record<
  ReportSource,
  Array<{ key: string; label: string; format: "currency" | "number" | "percent" | "text" }>
> = {
  overview: [
    { key: "investment_total", label: "Investimento Total (soma de todas as plataformas pagas)", format: "currency" },
    { key: "conversions_total", label: "Total de Conversões / Leads (todas as fontes)", format: "number" },
    { key: "cpa_general", label: "CPA / CPL Geral (custo médio por aquisição)", format: "currency" },
    { key: "roas", label: "ROAS / Receita Estimada", format: "currency" },
  ],
  ga4: [
    { key: "sessions", label: "Sessões Totais", format: "number" },
    { key: "engagement_rate", label: "Taxa de Engajamento (em %)", format: "percent" },
    { key: "key_events", label: "Eventos Principais (Conversões)", format: "number" },
    { key: "top_source", label: "Top Origem de Tráfego (nome da fonte)", format: "text" },
  ],
  meta_ads: [
    { key: "investment", label: "Investimento na Plataforma Meta Ads", format: "currency" },
    { key: "results", label: "Resultados (Leads/Compras)", format: "number" },
    { key: "cpa", label: "Custo por Resultado (CPA/CPL)", format: "currency" },
    { key: "ctr", label: "CTR — Taxa de Clique (em %)", format: "percent" },
  ],
  google_ads: [
    { key: "investment", label: "Investimento na Plataforma Google Ads", format: "currency" },
    { key: "conversions", label: "Conversões", format: "number" },
    { key: "cpa", label: "Custo por Conversão (CPA)", format: "currency" },
    { key: "cpc", label: "CPC Médio", format: "currency" },
    { key: "impression_share", label: "Índice de Impressão na Pesquisa (em %)", format: "percent" },
  ],
  tiktok_ads: [
    { key: "investment", label: "Investimento na Plataforma TikTok Ads", format: "currency" },
    { key: "cpa", label: "CPA / Custo por Lead", format: "currency" },
    { key: "video_views", label: "Visualizações de Vídeo (2s ou 6s)", format: "number" },
    { key: "cpc", label: "Custo por Clique (CPC)", format: "currency" },
  ],
  instagram_organic: [
    // Resumo geral do perfil
    { key: "reach", label: "Alcance (contas alcançadas no período)", format: "number" },
    { key: "engagement", label: "Engajamento (total absoluto, não percentual)", format: "number" },
    { key: "engagement_rate", label: "Taxa de Engajamento (em %)", format: "percent" },
    { key: "frequency", label: "Frequência (média de vezes que o conteúdo apareceu por usuário)", format: "number" },
    { key: "views", label: "Visualizações totais do perfil/conteúdo", format: "number" },
    { key: "interactions", label: "Interações totais", format: "number" },
    // Detalhamento de interações
    { key: "likes", label: "Curtidas (total)", format: "number" },
    { key: "comments", label: "Comentários (total)", format: "number" },
    { key: "shares", label: "Compartilhamentos (total)", format: "number" },
    { key: "saves", label: "Salvos (total)", format: "number" },
    { key: "profile_link_clicks", label: "Cliques em links do perfil", format: "number" },
    // Seguidores
    { key: "followers_total", label: "Total atual de seguidores no fim do período", format: "number" },
    { key: "new_followers", label: "Novos Seguidores no período (Follow / crescimento absoluto)", format: "number" },
    { key: "growth_rate", label: "Taxa de Crescimento de seguidores (em %)", format: "percent" },
    // Reels
    { key: "reels_total", label: "Total de Reels publicados no período", format: "number" },
    { key: "reels_views_total", label: "Visualizações totais somando todos os Reels", format: "number" },
    { key: "reels_views_avg", label: "Média de visualizações por Reel", format: "number" },
    // Posts no feed
    { key: "posts_total", label: "Total de Posts no feed publicados no período", format: "number" },
    { key: "posts_interactions_total", label: "Total de interações somando todos os posts do feed", format: "number" },
    // Stories
    { key: "stories_total", label: "Total de Stories publicados no período", format: "number" },
    { key: "stories_views_total", label: "Visualizações totais somando todos os Stories", format: "number" },
  ],
  tiktok_organic: [
    // Resumo geral do perfil
    { key: "likes", label: "Curtidas (total no período)", format: "number" },
    { key: "comments", label: "Comentários (total no período)", format: "number" },
    { key: "shares", label: "Compartilhamentos (total no período)", format: "number" },
    { key: "profile_views", label: "Visualizações do Perfil", format: "number" },
    { key: "video_views_total", label: "Visualizações nos Vídeos (soma de todos os vídeos)", format: "number" },
    { key: "following", label: "Seguindo (quantos perfis a conta segue)", format: "number" },
    { key: "videos_total", label: "Total de Vídeos publicados no período", format: "number" },
    { key: "posts_total", label: "Total de Posts publicados no período", format: "number" },
    // Seguidores
    { key: "followers_total", label: "Total atual de Seguidores no fim do período", format: "number" },
    { key: "new_followers", label: "Novos Seguidores no período (crescimento absoluto)", format: "number" },
    { key: "growth_rate", label: "Taxa de Crescimento de seguidores (em %)", format: "percent" },
    // Engajamento
    { key: "engagement_rate", label: "Taxa de Engajamento Geral (em %)", format: "percent" },
    { key: "interactions_total", label: "Total de Interações somando todos os posts", format: "number" },
    { key: "interactions_avg_per_post", label: "Média de Interações por Post", format: "number" },
    // Vídeos
    { key: "video_views_avg_per_post", label: "Média de Visualizações por Post/Vídeo", format: "number" },
    { key: "avg_watch_time", label: "Tempo Médio de Visualização em segundos (apenas o número, ex: 3.3 para 3,3s)", format: "number" },
    { key: "watched_full_rate", label: "Taxa Média de quem Assistiu o Vídeo até o Fim (em %)", format: "percent" },
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY ausente" }, 500);
    }

    // Verify caller is an admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: hasAdmin, error: roleErr } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || !hasAdmin) return json({ error: "Apenas admin" }, 403);

    const body = (await req.json()) as {
      client_id?: string;
      source?: ReportSource;
      pdf_path?: string;
    };
    const { client_id, source, pdf_path } = body;
    if (!client_id || !source || !pdf_path) {
      return json({ error: "Parâmetros obrigatórios: client_id, source, pdf_path" }, 400);
    }
    if (!METRICS[source]) return json({ error: "source inválido" }, 400);

    // Download PDF from storage
    const { data: file, error: dlErr } = await admin.storage
      .from("report-pdfs")
      .download(pdf_path);
    if (dlErr || !file) {
      return json({ error: `Falha ao baixar PDF: ${dlErr?.message ?? "desconhecido"}` }, 500);
    }

    const buf = new Uint8Array(await file.arrayBuffer());
    // Base64 encode
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < buf.length; i += chunkSize) {
      binary += String.fromCharCode(...buf.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    const dataUrl = `data:application/pdf;base64,${base64}`;

    // Build tool schema for the requested source
    const defs = METRICS[source];
    const properties: Record<string, { type: string; description: string }> = {};
    defs.forEach((d) => {
      properties[d.key] = {
        type: "string",
        description: `${d.label}. Formato: ${d.format}. Retorne apenas o número (ou texto, se 'text'). Use ponto como separador decimal. Se a métrica não estiver no PDF, retorne string vazia "".`,
      };
    });

    const systemPrompt = `Você é um analista de marketing digital especialista em extrair métricas de relatórios PDF do mLabs e similares. Leia o PDF anexado e extraia APENAS as métricas referentes à seção/aba solicitada. Se uma métrica não aparecer claramente, retorne string vazia "" — NÃO invente valores. Para valores monetários (currency) retorne apenas o número (ex: "12500.50" para R$ 12.500,50). Para percentuais retorne apenas o número (ex: "4.75" para 4,75%).`;

    const userPrompt = `Aba/Seção do relatório: ${source}\n\nExtraia as seguintes métricas do PDF:\n${defs.map((d) => `- ${d.key}: ${d.label} (${d.format})`).join("\n")}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_metrics",
              description: "Salva as métricas extraídas do PDF para a aba solicitada.",
              parameters: {
                type: "object",
                properties,
                required: defs.map((d) => d.key),
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_metrics" } },
      }),
    });

    if (aiResp.status === 429) {
      return json({ error: "Limite de requisições atingido. Tente novamente em instantes." }, 429);
    }
    if (aiResp.status === 402) {
      return json({ error: "Créditos da IA esgotados. Adicione créditos em Settings > Workspace." }, 402);
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return json({ error: `IA retornou erro ${aiResp.status}` }, 500);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return json({ error: "IA não retornou métricas estruturadas" }, 500);
    }
    const args = JSON.parse(toolCall.function.arguments) as Record<string, string>;

    // Filter only known keys + non-empty
    const cleaned: Record<string, string> = {};
    defs.forEach((d) => {
      const v = (args[d.key] ?? "").toString().trim();
      if (v) cleaned[d.key] = v;
    });

    // Persist: update metrics and pdf_path on client_reports (upsert)
    const { error: upsertErr } = await admin
      .from("client_reports")
      .upsert(
        {
          client_id,
          source,
          metrics: cleaned,
          pdf_path,
        },
        { onConflict: "client_id,source", ignoreDuplicates: false },
      );

    if (upsertErr) {
      console.error("upsert error", upsertErr);
      return json({ error: `Erro ao salvar métricas: ${upsertErr.message}` }, 500);
    }

    return json({ metrics: cleaned, count: Object.keys(cleaned).length });
  } catch (e) {
    console.error("parse-report-pdf error", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
