export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getInsights, getCampaignsList } from '@/services/meta/insights'
import { getAdInsights } from '@/services/meta/creatives'
import { prisma } from '@/services/db/client'

const anthropic = new Anthropic()

type ToolInput = Record<string, unknown>

// ── Tool definitions ──────────────────────────────────────────────────────────
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_overview_metrics',
    description: 'Retorna métricas gerais consolidadas do período: spend, receita, ROAS, compras, leads, impressões, CPM, CTR, CPC, alcance, frequência e taxas de conversão.',
    input_schema: {
      type: 'object' as const,
      properties: {
        startDate:   { type: 'string', description: 'Data início YYYY-MM-DD' },
        endDate:     { type: 'string', description: 'Data fim YYYY-MM-DD' },
        campaignIds: { type: 'array', items: { type: 'string' }, description: 'Filtrar por IDs de campanhas (opcional)' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'get_campaign_list',
    description: 'Lista todas as campanhas disponíveis com nome e ID. Use ANTES de filtrar por campanhas para descobrir os IDs corretos a partir dos nomes mencionados pelo usuário.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_campaign_insights',
    description: 'Retorna métricas detalhadas por campanha: spend, receita, ROAS, compras, leads, CTR, CPM, CPC, taxas de conversão. Cada campanha é uma linha de resultado.',
    input_schema: {
      type: 'object' as const,
      properties: {
        startDate:   { type: 'string', description: 'Data início YYYY-MM-DD' },
        endDate:     { type: 'string', description: 'Data fim YYYY-MM-DD' },
        campaignIds: { type: 'array', items: { type: 'string' }, description: 'Filtrar por IDs de campanhas específicas (opcional)' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'get_creative_performance',
    description: 'Retorna desempenho por criativo (nível de anúncio). Ideal para identificar melhores e piores criativos. Inclui spend, ROAS, compras, leads, CTR, CPM.',
    input_schema: {
      type: 'object' as const,
      properties: {
        startDate:   { type: 'string', description: 'Data início YYYY-MM-DD' },
        endDate:     { type: 'string', description: 'Data fim YYYY-MM-DD' },
        campaignIds: { type: 'array', items: { type: 'string' }, description: 'Filtrar por IDs de campanhas (opcional)' },
        sortBy:      { type: 'string', enum: ['spend', 'roas', 'purchases', 'leads', 'ctr', 'cpm'], description: 'Métrica para ordenar (padrão: spend)' },
        limit:       { type: 'number', description: 'Máximo de criativos retornados (padrão: 10, max: 30)' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'get_daily_evolution',
    description: 'Retorna evolução diária das métricas do período. Útil para ver tendências, picos e quedas ao longo do tempo.',
    input_schema: {
      type: 'object' as const,
      properties: {
        startDate:   { type: 'string', description: 'Data início YYYY-MM-DD' },
        endDate:     { type: 'string', description: 'Data fim YYYY-MM-DD' },
        campaignIds: { type: 'array', items: { type: 'string' }, description: 'Filtrar por IDs de campanhas (opcional)' },
      },
      required: ['startDate', 'endDate'],
    },
  },
]

// ── Tool execution ─────────────────────────────────────────────────────────────
async function executeTool(name: string, input: ToolInput, workspaceId: string): Promise<unknown> {
  const startDate   = input.startDate   as string
  const endDate     = input.endDate     as string
  const campaignIds = input.campaignIds as string[] | undefined

  switch (name) {
    case 'get_overview_metrics': {
      const rows = await getInsights({ startDate, endDate, campaignIds, workspaceId })
      if (!rows.length) return { message: 'Sem dados para o período informado.' }
      const t = rows.reduce(
        (acc, r) => ({
          spend:            acc.spend            + r.spend,
          impressions:      acc.impressions      + r.impressions,
          reach:            acc.reach            + r.reach,
          clicks:           acc.clicks           + r.clicks,
          linkClicks:       acc.linkClicks       + r.linkClicks,
          purchases:        acc.purchases        + r.purchases,
          leads:            acc.leads            + r.leads,
          initiateCheckout: acc.initiateCheckout + r.initiateCheckout,
          revenue:          acc.revenue          + r.revenue,
          landingPageViews: acc.landingPageViews + r.landingPageViews,
        }),
        { spend:0, impressions:0, reach:0, clicks:0, linkClicks:0,
          purchases:0, leads:0, initiateCheckout:0, revenue:0, landingPageViews:0 }
      )
      return {
        ...t,
        roas:            t.spend > 0             ? t.revenue     / t.spend              : 0,
        ctr:             t.impressions > 0       ? (t.clicks     / t.impressions) * 100 : 0,
        cpm:             t.impressions > 0       ? (t.spend      / t.impressions) * 1000: 0,
        cpc:             t.clicks > 0            ? t.spend       / t.clicks             : 0,
        costPerPurchase: t.purchases > 0         ? t.spend       / t.purchases          : 0,
        costPerLead:     t.leads > 0             ? t.spend       / t.leads              : 0,
        purchaseRate:    t.landingPageViews > 0  ? (t.purchases  / t.landingPageViews) * 100 : 0,
        leadRate:        t.landingPageViews > 0  ? (t.leads      / t.landingPageViews) * 100 : 0,
        connectRate:     t.clicks > 0            ? (t.landingPageViews / t.clicks) * 100 : 0,
      }
    }

    case 'get_campaign_list': {
      return await getCampaignsList({ workspaceId })
    }

    case 'get_campaign_insights': {
      const rows = await getInsights({ startDate, endDate, campaignIds, workspaceId })
      return rows.sort((a, b) => b.spend - a.spend).slice(0, 25)
    }

    case 'get_creative_performance': {
      const sortBy = (input.sortBy as string) || 'spend'
      const limit  = Math.min((input.limit as number) || 10, 30)
      const rows   = await getAdInsights({ startDate, endDate, campaignIds, workspaceId })
      return [...rows]
        .sort((a, b) => (b as unknown as Record<string, number>)[sortBy] - (a as unknown as Record<string, number>)[sortBy])
        .slice(0, limit)
        .map(r => ({
          adName:          r.adName,
          campaignName:    r.campaignName,
          adSetName:       r.adSetName,
          spend:           r.spend,
          revenue:         r.revenue,
          roas:            r.roas,
          purchases:       r.purchases,
          leads:           r.leads,
          ctr:             r.ctr,
          cpm:             r.cpm,
          cpc:             r.cpc,
          costPerPurchase: r.costPerPurchase,
          costPerLead:     r.costPerLead,
          impressions:     r.impressions,
        }))
    }

    case 'get_daily_evolution': {
      const rows = await getInsights({ startDate, endDate, campaignIds, daily: true, workspaceId })
      const map  = new Map<string, { spend:number; revenue:number; purchases:number; leads:number; impressions:number; clicks:number; landingPageViews:number }>()
      for (const r of rows) {
        const d   = r.date ?? ''
        const cur = map.get(d) ?? { spend:0, revenue:0, purchases:0, leads:0, impressions:0, clicks:0, landingPageViews:0 }
        map.set(d, {
          spend:            cur.spend            + r.spend,
          revenue:          cur.revenue          + r.revenue,
          purchases:        cur.purchases        + r.purchases,
          leads:            cur.leads            + r.leads,
          impressions:      cur.impressions      + r.impressions,
          clicks:           cur.clicks           + r.clicks,
          landingPageViews: cur.landingPageViews + r.landingPageViews,
        })
      }
      return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, m]) => ({
          date,
          ...m,
          roas: m.spend > 0       ? m.revenue / m.spend                 : 0,
          cpm:  m.impressions > 0 ? (m.spend / m.impressions) * 1000    : 0,
          ctr:  m.impressions > 0 ? (m.clicks / m.impressions) * 100    : 0,
        }))
    }

    default:
      return { error: `Ferramenta "${name}" não encontrada.` }
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(workspaceName: string): string {
  const today = new Date().toISOString().split('T')[0]
  return `Você é um analista de marketing digital especializado em tráfego pago no Meta (Facebook/Instagram Ads).
Você está analisando os dados do cliente: **${workspaceName}**.
Data de hoje: ${today}

REGRAS IMPORTANTES:
1. Você SOMENTE tem acesso aos dados deste cliente ("${workspaceName}"). Jamais misture dados de outros clientes.
2. Se a pergunta for vaga (sem período definido, sem especificar produto/campanha), PERGUNTE antes de buscar dados. Exemplos: "De qual período você quer ver?" / "Quer filtrar por alguma campanha específica ou ver todas?"
3. Antes de buscar insights de campanhas por nome, use get_campaign_list para encontrar os IDs corretos.
4. Responda sempre em português (pt-BR), de forma direta e objetiva.
5. Use markdown para formatar respostas: **negrito**, tabelas com |, listas com -, etc.
6. Além dos números, dê insights acionáveis quando relevante (ex: "O criativo X tem CTR 3x maior — vale escalar").
7. Para datas relativas: "últimos 7 dias" = ${new Date(Date.now() - 7*86400000).toISOString().split('T')[0]} até ${today}. "Últimos 30 dias" = ${new Date(Date.now() - 30*86400000).toISOString().split('T')[0]} até ${today}.
8. Seja conciso: não explique o que vai fazer antes de fazer, nem repita os dados crus sem análise.`
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { workspaceId, messages } = body as { workspaceId: string; messages: { role: string; content: string }[] }

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId obrigatório' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada no servidor.' }, { status: 500 })
  }

  const workspace = await prisma.workspace.findUnique({
    where:  { id: workspaceId },
    select: { name: true },
  })
  const workspaceName = workspace?.name ?? workspaceId

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      try {
        let apiMessages: Anthropic.MessageParam[] = messages.map(m => ({
          role:    m.role as 'user' | 'assistant',
          content: m.content,
        }))

        // Tool use loop (max 6 iterations to prevent infinite loops)
        for (let i = 0; i < 6; i++) {
          const response = await anthropic.messages.create({
            model:      'claude-sonnet-4-6',
            max_tokens: 4096,
            system:     buildSystemPrompt(workspaceName),
            tools:      TOOLS,
            messages:   apiMessages,
          })

          if (response.stop_reason === 'tool_use') {
            const toolResults: Anthropic.ToolResultBlockParam[] = []

            for (const block of response.content) {
              if (block.type !== 'tool_use') continue
              send({ type: 'tool_start', name: block.name })
              const result = await executeTool(block.name, block.input as ToolInput, workspaceId)
              toolResults.push({
                type:        'tool_result',
                tool_use_id: block.id,
                content:     JSON.stringify(result),
              })
            }

            apiMessages = [
              ...apiMessages,
              { role: 'assistant', content: response.content },
              { role: 'user',      content: toolResults },
            ]
            continue
          }

          // End turn — emit text
          for (const block of response.content) {
            if (block.type === 'text') {
              send({ type: 'text', delta: block.text })
            }
          }
          break
        }
      } catch (e) {
        send({ type: 'error', message: e instanceof Error ? e.message : 'Erro desconhecido' })
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
