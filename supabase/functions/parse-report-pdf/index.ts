// Parse a report PDF using Lovable AI and return extracted metrics,
// period (start/end dates), comparative previous-period metrics and a
// daily time series for richer dashboard visualization. Admin-only.

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
    { key: "reach", label: "Alcance (contas alcançadas no período)", format: "number" },
    { key: "engagement", label: "Engajamento (total absoluto, não percentual)", format: "number" },
    { key: "engagement_rate", label: "Taxa de Engajamento (em %)", format: "percent" },
    { key: "frequency", label: "Frequência (média de vezes que o conteúdo apareceu por usuário)", format: "number" },
    { key: "views", label: "Visualizações totais do perfil/conteúdo", format: "number" },
    { key: "interactions", label: "Interações totais", format: "number" },
    { key: "likes", label: "Curtidas (total)", format: "number" },
    { key: "comments", label: "Comentários (total)", format: "number" },
    { key: "shares", label: "Compartilhamentos (total)", format: "number" },
    { key: "saves", label: "Salvos (total)", format: "number" },
    { key: "profile_link_clicks", label: "Cliques em links do perfil", format: "number" },
    { key: "followers_total", label: "Total atual de seguidores no fim do período", format: "number" },
    { key: "new_followers", label: "Novos Seguidores no período (Follow / crescimento absoluto)", format: "number" },
    { key: "growth_rate", label: "Taxa de Crescimento de seguidores (em %)", format: "percent" },
    { key: "reels_total", label: "Total de Reels publicados no período", format: "number" },
    { key: "reels_views_total", label: "Visualizações totais somando todos os Reels", format: "number" },
    { key: "reels_views_avg", label: "Média de visualizações por Reel", format: "number" },
    { key: "posts_total", label: "Total de Posts no feed publicados no período", format: "number" },
    { key: "posts_interactions_total", label: "Total de interações somando todos os posts do feed", format: "number" },
    { key: "stories_total", label: "Total de Stories publicados no período", format: "number" },
    { key: "stories_views_total", label: "Visualizações totais somando todos os Stories", format: "number" },
  ],
  tiktok_organic: [
    { key: "likes", label: "Curtidas (total no período)", format: "number" },
    { key: "comments", label: "Comentários (total no período)", format: "number" },
    { key: "shares", label: "Compartilhamentos (total no período)", format: "number" },
    { key: "profile_views", label: "Visualizações do Perfil", format: "number" },
    { key: "video_views_total", label: "Visualizações nos Vídeos (soma de todos os vídeos)", format: "number" },
    { key: "following", label: "Seguindo (quantos perfis a conta segue)", format: "number" },
    { key: "videos_total", label: "Total de Vídeos publicados no período", format: "number" },
    { key: "posts_total", label: "Total de Posts publicados no período", format: "number" },
    { key: "followers_total", label: "Total atual de Seguidores no fim do período", format: "number" },
    { key: "new_followers", label: "Novos Seguidores no período (crescimento absoluto)", format: "number" },
    { key: "growth_rate", label: "Taxa de Crescimento de seguidores (em %)", format: "percent" },
    { key: "engagement_rate", label: "Taxa de Engajamento Geral (em %)", format: "percent" },
    { key: "interactions_total", label: "Total de Interações somando todos os posts", format: "number" },
    { key: "interactions_avg_per_post", label: "Média de Interações por Post", format: "number" },
    { key: "video_views_avg_per_post", label: "Média de Visualizações por Post/Vídeo", format: "number" },
    { key: "avg_watch_time", label: "Tempo Médio de Visualização em segundos (apenas o número, ex: 3.3 para 3,3s)", format: "number" },
    { key: "watched_full_rate", label: "Taxa Média de quem Assistiu o Vídeo até o Fim (em %)", format: "percent" },
  ],
};

// Métricas-chave para alimentar a série temporal (gráficos de linha) por aba.
// O modelo só gerará time_series se a aba for organic (Instagram / TikTok).
const TIME_SERIES_KEYS: Partial<Record<ReportSource, string[]>> = {
  instagram_organic: ["reach", "interactions", "followers_total", "views"],
  tiktok_organic: ["video_views_total", "interactions_total", "followers_total", "profile_views"],
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

    const { data: file, error: dlErr } = await admin.storage
      .from("report-pdfs")
      .download(pdf_path);
    if (dlErr || !file) {
      return json({ error: `Falha ao baixar PDF: ${dlErr?.message ?? "desconhecido"}` }, 500);
    }

    const buf = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < buf.length; i += chunkSize) {
      binary += String.fromCharCode(...buf.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    const dataUrl = `data:application/pdf;base64,${base64}`;

    const defs = METRICS[source];
    const seriesKeys = TIME_SERIES_KEYS[source] ?? [];
    const wantsSeries = seriesKeys.length > 0;

    // Build properties: current metrics + previous-period metrics (same keys) + period dates + optional time series
    const metricProps: Record<string, { type: string; description: string }> = {};
    const previousProps: Record<string, { type: string; description: string }> = {};
    defs.forEach((d) => {
      metricProps[d.key] = {
        type: "string",
        description: `${d.label}. Formato: ${d.format}. Apenas o número (ponto como decimal). "" se ausente.`,
      };
      previousProps[d.key] = {
        type: "string",
        description: `Mesma métrica "${d.label}" referente ao PERÍODO ANTERIOR comparativo (se o PDF mostrar comparação/variação). "" se não houver.`,
      };
    });

    const parameters: Record<string, unknown> = {
      type: "object",
      properties: {
        period_start: {
          type: "string",
          description:
            'Data inicial do período do relatório no formato ISO YYYY-MM-DD. Procure por textos como "Período: 01/03/2025 a 31/03/2025" ou similares. "" se não encontrar.',
        },
        period_end: {
          type: "string",
          description: 'Data final do período do relatório no formato ISO YYYY-MM-DD. "" se não encontrar.',
        },
        metrics: {
          type: "object",
          description: "Métricas do período atual extraídas do PDF.",
          properties: metricProps,
          required: defs.map((d) => d.key),
          additionalProperties: false,
        },
        previous_metrics: {
          type: "object",
          description:
            "Métricas do PERÍODO ANTERIOR para comparação 'antes vs depois'. Apenas se o PDF mostrar comparativo (variação % ou valor anterior). Use as mesmas chaves.",
          properties: previousProps,
          required: defs.map((d) => d.key),
          additionalProperties: false,
        },
      },
      required: ["period_start", "period_end", "metrics", "previous_metrics"],
      additionalProperties: false,
    };

    if (wantsSeries) {
      (parameters as { properties: Record<string, unknown> }).properties.time_series = {
        type: "array",
        description: `Série temporal DIÁRIA do período, se o PDF apresentar gráfico de linha por dia. Cada ponto deve conter "date" (YYYY-MM-DD) e os valores numéricos das métricas: ${seriesKeys.join(", ")}. Retorne array vazio [] se não houver dados diários.`,
        items: {
          type: "object",
          properties: {
            date: { type: "string", description: "Data ISO YYYY-MM-DD" },
            ...Object.fromEntries(
              seriesKeys.map((k) => [k, { type: "number", description: `Valor de ${k} no dia` }]),
            ),
          },
          required: ["date"],
          additionalProperties: false,
        },
      };
      (parameters as { required: string[] }).required.push("time_series");
    }

    const systemPrompt = `Você é um analista de marketing digital especialista em extrair dados estruturados de relatórios PDF do mLabs e plataformas similares (Instagram, TikTok, Meta Ads, Google Ads, GA4).

REGRAS CRÍTICAS:
1. Leia TODAS as páginas do PDF anexado.
2. Identifique o PERÍODO do relatório (datas de início e fim) — geralmente aparece no topo, em frases como "Período: 01/03/2025 a 31/03/2025" ou "01 mar 2025 - 31 mar 2025".
3. Extraia as métricas do PERÍODO ATUAL.
4. Se o PDF mostrar COMPARAÇÃO com período anterior (setas de variação %, "vs período anterior", "anterior: X"), extraia também os valores do período anterior em previous_metrics.
5. Se houver gráfico DIÁRIO de linha no PDF, extraia a série temporal ponto a ponto em time_series.
6. NUNCA invente valores. Se não encontrar uma métrica, retorne string vazia "".
7. Para currency e percent retorne APENAS o número (ex: "12500.50", "4.75"). Use ponto como decimal.`;

    const userPrompt = `Aba/Seção do relatório: ${source}\n\nMétricas a extrair:\n${defs.map((d) => `- ${d.key}: ${d.label} (${d.format})`).join("\n")}${wantsSeries ? `\n\nSérie temporal diária esperada (se houver gráfico): ${seriesKeys.join(", ")}` : ""}`;

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
              name: "save_report",
              description: "Salva o relatório completo extraído do PDF.",
              parameters,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_report" } },
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
      return json({ error: "IA não retornou dados estruturados" }, 500);
    }
    const args = JSON.parse(toolCall.function.arguments) as {
      period_start?: string;
      period_end?: string;
      metrics?: Record<string, string>;
      previous_metrics?: Record<string, string>;
      time_series?: Array<Record<string, string | number>>;
    };

    const cleanedMetrics: Record<string, string> = {};
    const cleanedPrev: Record<string, string> = {};
    defs.forEach((d) => {
      const v = (args.metrics?.[d.key] ?? "").toString().trim();
      if (v) cleanedMetrics[d.key] = v;
      const p = (args.previous_metrics?.[d.key] ?? "").toString().trim();
      if (p) cleanedPrev[d.key] = p;
    });

    const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
    const period_start = isDate(args.period_start) ? args.period_start! : null;
    const period_end = isDate(args.period_end) ? args.period_end! : null;

    const time_series = Array.isArray(args.time_series)
      ? args.time_series.filter((p) => typeof p?.date === "string")
      : [];

    const { error: upsertErr } = await admin
      .from("client_reports")
      .upsert(
        {
          client_id,
          source,
          metrics: cleanedMetrics,
          previous_metrics: cleanedPrev,
          period_start,
          period_end,
          time_series,
          pdf_path,
        },
        { onConflict: "client_id,source", ignoreDuplicates: false },
      );

    if (upsertErr) {
      console.error("upsert error", upsertErr);
      return json({ error: `Erro ao salvar: ${upsertErr.message}` }, 500);
    }

    return json({
      metrics: cleanedMetrics,
      previous_metrics: cleanedPrev,
      period_start,
      period_end,
      time_series,
      count: Object.keys(cleanedMetrics).length,
    });
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
