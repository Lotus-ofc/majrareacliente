// ingest-report: processa PDF/CSV/Excel de relatório, chama Gemini para extrair
// métricas estruturadas + análise qualitativa e salva um snapshot histórico em
// public.report_snapshots (multi-tenant via agency_id).
//
// Body JSON: { client_id, source, file_path, file_mime, period_start?, period_end? }
// file_path: caminho dentro do bucket "report-pdfs".

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReportSource =
  | "overview" | "ga4" | "meta_ads" | "google_ads"
  | "tiktok_ads" | "instagram_organic" | "tiktok_organic";

const METRICS: Record<ReportSource, Array<{ key: string; label: string; format: string }>> = {
  overview: [
    { key: "investment_total", label: "Investimento Total", format: "currency" },
    { key: "conversions_total", label: "Total de Conversões / Leads", format: "number" },
    { key: "cpa_general", label: "CPA / CPL Geral", format: "currency" },
    { key: "roas", label: "ROAS / Receita Estimada", format: "currency" },
  ],
  ga4: [
    { key: "sessions", label: "Sessões Totais", format: "number" },
    { key: "engagement_rate", label: "Taxa de Engajamento (%)", format: "percent" },
    { key: "key_events", label: "Eventos Principais", format: "number" },
    { key: "top_source", label: "Top Origem de Tráfego", format: "text" },
  ],
  meta_ads: [
    { key: "investment", label: "Investimento Meta Ads", format: "currency" },
    { key: "results", label: "Resultados", format: "number" },
    { key: "cpa", label: "Custo por Resultado", format: "currency" },
    { key: "ctr", label: "CTR (%)", format: "percent" },
  ],
  google_ads: [
    { key: "investment", label: "Investimento Google Ads", format: "currency" },
    { key: "conversions", label: "Conversões", format: "number" },
    { key: "cpa", label: "CPA", format: "currency" },
    { key: "cpc", label: "CPC Médio", format: "currency" },
    { key: "impression_share", label: "Impression Share (%)", format: "percent" },
  ],
  tiktok_ads: [
    { key: "investment", label: "Investimento TikTok Ads", format: "currency" },
    { key: "cpa", label: "CPA / Custo por Lead", format: "currency" },
    { key: "video_views", label: "Visualizações de Vídeo", format: "number" },
    { key: "cpc", label: "CPC", format: "currency" },
  ],
  instagram_organic: [
    { key: "reach", label: "Alcance", format: "number" },
    { key: "engagement", label: "Engajamento (absoluto)", format: "number" },
    { key: "engagement_rate", label: "Taxa de Engajamento (%)", format: "percent" },
    { key: "views", label: "Visualizações", format: "number" },
    { key: "interactions", label: "Interações totais", format: "number" },
    { key: "likes", label: "Curtidas", format: "number" },
    { key: "comments", label: "Comentários", format: "number" },
    { key: "shares", label: "Compartilhamentos", format: "number" },
    { key: "saves", label: "Salvos", format: "number" },
    { key: "profile_link_clicks", label: "Cliques em link do perfil", format: "number" },
    { key: "followers_total", label: "Seguidores ao final do período", format: "number" },
    { key: "new_followers", label: "Novos Seguidores", format: "number" },
    { key: "growth_rate", label: "Taxa de Crescimento (%)", format: "percent" },
    { key: "reels_total", label: "Total de Reels", format: "number" },
    { key: "reels_views_total", label: "Views totais Reels", format: "number" },
    { key: "posts_total", label: "Posts no feed", format: "number" },
    { key: "stories_total", label: "Total de Stories", format: "number" },
    { key: "stories_views_total", label: "Views totais Stories", format: "number" },
  ],
  tiktok_organic: [
    { key: "likes", label: "Curtidas", format: "number" },
    { key: "comments", label: "Comentários", format: "number" },
    { key: "shares", label: "Compartilhamentos", format: "number" },
    { key: "profile_views", label: "Visualizações do perfil", format: "number" },
    { key: "video_views_total", label: "Views nos vídeos", format: "number" },
    { key: "videos_total", label: "Total de vídeos", format: "number" },
    { key: "followers_total", label: "Total de seguidores", format: "number" },
    { key: "new_followers", label: "Novos Seguidores", format: "number" },
    { key: "growth_rate", label: "Taxa de Crescimento (%)", format: "percent" },
    { key: "engagement_rate", label: "Taxa de Engajamento (%)", format: "percent" },
    { key: "interactions_total", label: "Total de interações", format: "number" },
    { key: "avg_watch_time", label: "Tempo médio de visualização (s)", format: "number" },
    { key: "watched_full_rate", label: "Taxa de vídeo assistido até o fim (%)", format: "percent" },
  ],
};

const TIME_SERIES_KEYS: Partial<Record<ReportSource, string[]>> = {
  instagram_organic: ["reach", "interactions", "followers_total", "views"],
  tiktok_organic: ["video_views_total", "interactions_total", "followers_total", "profile_views"],
  meta_ads: ["investment", "results"],
  google_ads: ["investment", "conversions"],
  tiktok_ads: ["investment", "video_views"],
  ga4: ["sessions", "key_events"],
  overview: ["investment_total", "conversions_total"],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sniffMime(path: string, mime?: string): "pdf" | "csv" | "xlsx" | "unknown" {
  const m = (mime ?? "").toLowerCase();
  const p = path.toLowerCase();
  if (m.includes("pdf") || p.endsWith(".pdf")) return "pdf";
  if (m.includes("csv") || p.endsWith(".csv")) return "csv";
  if (m.includes("sheet") || m.includes("excel") || p.endsWith(".xlsx") || p.endsWith(".xls")) return "xlsx";
  return "unknown";
}

function bytesToBase64(buf: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) bin += String.fromCharCode(...buf.subarray(i, i + chunk));
  return btoa(bin);
}

function tabularToText(buf: Uint8Array, kind: "csv" | "xlsx"): string {
  if (kind === "csv") {
    const txt = new TextDecoder("utf-8").decode(buf);
    return txt.slice(0, 200_000);
  }
  const wb = XLSX.read(buf, { type: "array" });
  const out: string[] = [];
  for (const name of wb.SheetNames) {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]);
    out.push(`### Sheet: ${name}\n${csv}`);
  }
  return out.join("\n\n").slice(0, 200_000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY ausente" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const [{ data: isAdmin }, { data: isAgencyAdmin }] = await Promise.all([
      admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" }),
      admin.rpc("has_role", { _user_id: userData.user.id, _role: "agency_admin" }),
    ]);
    if (!isAdmin && !isAgencyAdmin) return json({ error: "Apenas administradores" }, 403);

    const body = await req.json() as {
      client_id?: string;
      source?: ReportSource | "auto";
      file_path?: string;
      file_mime?: string;
      period_start?: string;
      period_end?: string;
    };
    const { client_id, file_path, file_mime } = body;
    let { source } = body;
    if (!client_id || !file_path) {
      return json({ error: "Parâmetros obrigatórios: client_id, file_path" }, 400);
    }
    if (source && source !== "auto" && !METRICS[source as ReportSource]) {
      return json({ error: "source inválido" }, 400);
    }

    // Resolve agency_id do cliente.
    const { data: clientProfile, error: profErr } = await admin
      .from("profiles").select("agency_id").eq("id", client_id).maybeSingle();
    if (profErr || !clientProfile?.agency_id) {
      return json({ error: "Não foi possível resolver agency_id do cliente" }, 400);
    }
    const agency_id = clientProfile.agency_id as string;

    // Download arquivo
    const { data: file, error: dlErr } = await admin.storage.from("report-pdfs").download(file_path);
    if (dlErr || !file) return json({ error: `Falha ao baixar arquivo: ${dlErr?.message}` }, 500);
    const buf = new Uint8Array(await file.arrayBuffer());
    const kind = sniffMime(file_path, file_mime);
    if (kind === "unknown") return json({ error: "Formato não suportado (use PDF, CSV ou XLSX)" }, 400);

    // Build user content (reused for classification + extraction)
    const buildContent = (promptText: string): unknown => {
      if (kind === "pdf") {
        const dataUrl = `data:application/pdf;base64,${bytesToBase64(buf)}`;
        return [
          { type: "text", text: promptText },
          { type: "image_url", image_url: { url: dataUrl } },
        ];
      }
      const text = tabularToText(buf, kind);
      return `${promptText}\n\n--- DADOS DO ARQUIVO (${kind.toUpperCase()}) ---\n${text}`;
    };

    const callGemini = async (
      systemPrompt: string,
      userContent: unknown,
      tool: { name: string; parameters: Record<string, unknown> },
    ) => {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          tools: [{ type: "function", function: { name: tool.name, description: "", parameters: tool.parameters } }],
          tool_choice: { type: "function", function: { name: tool.name } },
        }),
      });
      if (r.status === 429) throw new Error("RATE_LIMIT");
      if (r.status === 402) throw new Error("CREDITS");
      if (!r.ok) {
        const t = await r.text();
        console.error("AI error", r.status, t);
        throw new Error(`IA retornou erro ${r.status}`);
      }
      const j = await r.json();
      const tc = j?.choices?.[0]?.message?.tool_calls?.[0];
      if (!tc) throw new Error("IA não retornou dados estruturados");
      return JSON.parse(tc.function.arguments);
    };

    // Step 1: classify if auto
    if (!source || source === "auto") {
      try {
        const sourceKeys = Object.keys(METRICS) as ReportSource[];
        const classifyParams = {
          type: "object",
          properties: {
            source: { type: "string", enum: sourceKeys, description: "Plataforma identificada no relatório." },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
            reason: { type: "string", description: "Justificativa curta da escolha." },
          },
          required: ["source", "confidence", "reason"],
          additionalProperties: false,
        };
        const classifySystem = `Você classifica relatórios de marketing digital. Identifique a plataforma com base no conteúdo.
Mapeamento:
- overview: visão consolidada de várias plataformas (mLabs Overview, dashboards executivos)
- ga4: Google Analytics 4 (sessões, eventos, origem de tráfego)
- meta_ads: Meta Ads / Facebook Ads / Instagram Ads (anúncios pagos)
- google_ads: Google Ads (anúncios pagos no Google)
- tiktok_ads: TikTok Ads (anúncios pagos no TikTok)
- instagram_organic: Instagram orgânico (alcance, seguidores, reels, stories)
- tiktok_organic: TikTok orgânico (views, seguidores, vídeos)`;
        const classifyContent = buildContent("Identifique a qual plataforma este relatório pertence. Retorne UM source.");
        const cls = await callGemini(classifySystem, classifyContent, {
          name: "classify_source",
          parameters: classifyParams,
        });
        const detected = cls?.source as ReportSource | undefined;
        if (!detected || !METRICS[detected]) {
          return json({ error: "Não foi possível identificar a plataforma do relatório. Verifique o arquivo." }, 422);
        }
        source = detected;
        console.log("auto-detected source:", detected, "confidence:", cls?.confidence);
      } catch (e) {
        const msg = (e as Error).message;
        if (msg === "RATE_LIMIT") return json({ error: "Limite de requisições atingido. Tente novamente em instantes." }, 429);
        if (msg === "CREDITS") return json({ error: "Créditos da IA esgotados." }, 402);
        return json({ error: `Falha ao classificar: ${msg}` }, 500);
      }
    }

    const defs = METRICS[source as ReportSource];
    const seriesKeys = TIME_SERIES_KEYS[source as ReportSource] ?? [];

    // Build schema properties
    const metricProps: Record<string, unknown> = {};
    const previousProps: Record<string, unknown> = {};
    for (const d of defs) {
      metricProps[d.key] = { type: "string", description: `${d.label} (${d.format}). Apenas número, ponto como decimal. "" se ausente.` };
      previousProps[d.key] = { type: "string", description: `${d.label} no PERÍODO ANTERIOR. "" se não houver.` };
    }

    const parameters: Record<string, unknown> = {
      type: "object",
      properties: {
        period_start: { type: "string", description: 'Data inicial YYYY-MM-DD ou "".' },
        period_end: { type: "string", description: 'Data final YYYY-MM-DD ou "".' },
        metrics: { type: "object", properties: metricProps, required: defs.map(d => d.key), additionalProperties: false },
        previous_metrics: { type: "object", properties: previousProps, required: defs.map(d => d.key), additionalProperties: false },
        time_series: {
          type: "array",
          description: `Série diária se disponível. Cada item: { date: YYYY-MM-DD, ${seriesKeys.join(", ")} }.`,
          items: {
            type: "object",
            properties: {
              date: { type: "string" },
              ...Object.fromEntries(seriesKeys.map(k => [k, { type: "number" }])),
            },
            required: ["date"],
            additionalProperties: false,
          },
        },
        ai_analysis: {
          type: "string",
          description: "Análise qualitativa em português (3-6 parágrafos curtos): cenário do período, principais variações, insights e 2-3 recomendações práticas. Use markdown leve.",
        },
      },
      required: ["period_start", "period_end", "metrics", "previous_metrics", "time_series", "ai_analysis"],
      additionalProperties: false,
    };

    const systemPrompt = `Você é um analista sênior de marketing digital. Extraia dados estruturados de relatórios (mLabs, Meta, Google, TikTok, GA4) e produza uma análise executiva curta em português.
REGRAS:
- Nunca invente números. Se não encontrar, retorne "".
- Currency/percent: apenas o número com ponto decimal (ex: "12500.50", "4.75").
- Identifique o período do relatório (datas).
- Se houver comparação com período anterior, preencha previous_metrics.
- Se houver dados diários, preencha time_series.
- ai_analysis deve ser objetiva, sem rodeios, apontando o que mudou e o que fazer.`;

    const userPromptText = `Aba/Plataforma: ${source}\n\nMétricas alvo:\n${defs.map(d => `- ${d.key}: ${d.label} (${d.format})`).join("\n")}${seriesKeys.length ? `\n\nSérie diária esperada: ${seriesKeys.join(", ")}` : ""}`;

    let args: {
      period_start?: string;
      period_end?: string;
      metrics?: Record<string, string>;
      previous_metrics?: Record<string, string>;
      time_series?: Array<Record<string, unknown>>;
      ai_analysis?: string;
    };
    try {
      args = await callGemini(systemPrompt, buildContent(userPromptText), {
        name: "save_snapshot",
        parameters,
      });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "RATE_LIMIT") return json({ error: "Limite de requisições atingido. Tente novamente em instantes." }, 429);
      if (msg === "CREDITS") return json({ error: "Créditos da IA esgotados." }, 402);
      return json({ error: msg }, 500);
    }

    const cleanedMetrics: Record<string, string> = {};
    const cleanedPrev: Record<string, string> = {};
    for (const d of defs) {
      const v = (args.metrics?.[d.key] ?? "").toString().trim();
      if (v) cleanedMetrics[d.key] = v;
      const p = (args.previous_metrics?.[d.key] ?? "").toString().trim();
      if (p) cleanedPrev[d.key] = p;
    }

    const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
    const period_start = isDate(args.period_start) ? args.period_start! : (body.period_start ?? null);
    const period_end = isDate(args.period_end) ? args.period_end! : (body.period_end ?? null);
    const time_series = Array.isArray(args.time_series)
      ? args.time_series.filter(p => typeof p?.date === "string")
      : [];

    const dashboard_layout = {
      metrics: cleanedMetrics,
      previous_metrics: cleanedPrev,
      time_series,
    };
    const raw_data = {
      file_path,
      file_kind: kind,
      ai_raw: args,
    };

    const { data: snapshot, error: insErr } = await admin
      .from("report_snapshots")
      .insert({
        client_id,
        agency_id,
        source,
        period_start,
        period_end,
        pdf_path: file_path,
        raw_data,
        dashboard_layout,
        ai_analysis: (args.ai_analysis ?? "").trim(),
      })
      .select()
      .single();

    if (insErr) {
      console.error("insert error", insErr);
      return json({ error: `Erro ao salvar snapshot: ${insErr.message}` }, 500);
    }

    return json({ snapshot });
  } catch (e) {
    console.error("ingest-report error", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
