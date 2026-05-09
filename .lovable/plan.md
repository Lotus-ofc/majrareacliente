## Visão geral

Quatro frentes grandes que mudam a arquitetura do portal. Antes de gastar muitos passos editando código, preciso confirmar pontos-chave com você — algumas decisões mudam profundamente o que será construído.

---

## 1. Posts do cliente em Modal com tabs (Publicados / Agendados / Pendentes)

Hoje `ClientCalendarView` exibe os posts dentro do dashboard como uma view. Vou:

- Manter a aba lateral "Aprovação de Posts".
- Ao clicar em um post (ou em um botão "Abrir aprovação"), abrir um **Dialog** que ocupa boa parte da tela.
- Dentro do Dialog: `Tabs` com 3 abas — **Pendentes** (aguardando aprovação), **Agendados** (aprovados, ainda não publicados) e **Publicados** (já no ar — derivado por `getDisplayStatus`).
- Cada aba lista os posts do cliente daquele status, com o card atual de aprovação/sugestão de legenda dentro.
- Fecha apenas pelo "x" (já é o padrão atual).

**Decisão a confirmar:** o Modal substitui completamente a view atual, ou a view continua existindo (lista) e o Modal é só o detalhe?

---

## 2. Dashboards dinâmicos com IA (Gemini) a partir de relatórios mLabs

Hoje os relatórios são preenchidos manualmente em `client_reports` (campos texto). A proposta nova é:

- Admin faz upload do relatório bruto exportado do mLabs (PDF/CSV/Excel) por plataforma (Meta Ads, GA4, TikTok, TikTok Ads, Instagram orgânico, Google Ads).
- Edge Function chama **Gemini (Lovable AI Gateway)** com o conteúdo bruto e devolve JSON estruturado: KPIs + séries temporais + sugestão de gráficos (`bar`, `line`, `donut`, etc.).
- Frontend renderiza esse JSON com **Recharts** (já no projeto via shadcn/`chart.tsx`), aplicando o branding **Roxo Escuro + Verde Neon de alto contraste**.
- O parser atual `parse-report-pdf` é estendido / substituído por um pipeline `ingest-report` que devolve o schema novo.

**Decisões a confirmar:**
- **a)** Os relatórios continuam por plataforma (1 relatório por fonte por período) ou viram um único relatório consolidado?
- **b)** O upload aceita PDF apenas (como hoje) ou também CSV/Excel exportados do mLabs?
- **c)** Posso ajustar a paleta global (`--primary`, `--accent`) para Roxo Escuro + Verde Neon, ou devo criar tokens novos só para os gráficos sem alterar o resto da UI?

---

## 3. Aba "Análise da IA" dentro de cada relatório

- Adicionar `Tabs` na view do relatório: **Dashboard** | **Análise da IA**.
- Aba IA: chama Gemini com os dados brutos + métricas estruturadas e gera texto qualitativo (cenário, insights, recomendações). Markdown renderizado no front.
- A análise é **gerada uma vez** quando o relatório é processado e salva no banco (não regenera a cada visita — economiza créditos e mantém histórico).
- Botão "Regenerar análise" disponível só para admin.

---

## 4. Histórico por data + arquitetura SaaS-ready

Hoje `client_reports` tem 1 linha por `(client_id, source)` — só guarda o estado atual. Para histórico:

- Nova tabela **`report_snapshots`**: `id`, `client_id`, `agency_id`, `source`, `period_start`, `period_end`, `snapshot_date`, `raw_data jsonb`, `dashboard_layout jsonb` (gráficos+KPIs gerados pela IA), `ai_analysis text`, timestamps.
- Substituir o "período fixo" por um **Select de datas** populado com os snapshots disponíveis daquele cliente+fonte. Selecionar uma data carrega o snapshot exato (gráficos + análise daquela época).
- **SaaS multi-tenant:** introduzir conceito de **Agência**:
  - Tabela `agencies` (id, name, slug, branding jsonb, owner_user_id).
  - `profiles` ganha `agency_id`.
  - Nova role `agency_admin` (além de `admin` global e `client`).
  - RLS de todas as tabelas de domínio (`editorial_posts`, `invoices`, `client_reports`, `report_snapshots`, `editorial_notes`, `notifications`) passa a filtrar por `agency_id` do usuário logado, não só `auth.uid()`.
  - `has_role` ganha variante `is_agency_member(agency_id)`.

**Decisões a confirmar:**
- **d)** Posso prosseguir com a tabela `agencies` + coluna `agency_id` em todas as tabelas existentes (migração grande, mas reversível), ou prefere **adiar a parte multi-tenant** e fazer agora apenas o histórico de snapshots, deixando a estrutura de Agência para uma próxima etapa?
- **e)** Hoje só existe um admin global (você). Na nova arquitetura, esse admin vira o "owner" da agência Leandro MAJR — todos os clientes atuais ficam atrelados a essa agência por padrão. OK?

---

## Detalhes técnicos (resumo)

- **Lovable AI Gateway** com modelo `google/gemini-2.5-flash` (estruturado) + `gemini-2.5-pro` para a análise qualitativa. Usa `LOVABLE_API_KEY` (já configurado).
- Edge Functions novas: `ingest-report` (extrai + estrutura + gera análise) e talvez `regenerate-analysis`.
- Frontend: Recharts (via `src/components/ui/chart.tsx`), novo componente `<ReportSnapshotView>` que renderiza dashboard dinâmico a partir do `dashboard_layout` JSON.
- Notificações `notifications` ganham um `kind` extra: `new_report_snapshot`.
- Tudo escopado por `agency_id` (se aprovado item d).

---

## Pergunta antes de começar

Esse plano tem ~5 dias de trabalho de implementação. Antes de tocar código, preciso das suas respostas para **a, b, c, d, e** acima — especialmente **d** (multi-tenant agora ou depois), porque ela define o tamanho da migração de banco.

Quer que eu envie essas decisões como múltipla escolha (questions) para ficar mais rápido de responder?