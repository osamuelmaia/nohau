import OpenAI from 'openai'

export interface AuditInput {
  url:       string
  pageType:  string
  goal:      string
  audience:  string
  offer:     string
  notes?:    string
}

// ── Fetch and extract readable text from the URL ──────────────────────────────
export async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    signal:  AbortSignal.timeout(20000),
    redirect: 'follow',
  })

  if (!res.ok) throw new Error(`Não foi possível acessar a página (HTTP ${res.status})`)

  const html = await res.text()

  const text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return text.slice(0, 60000) // ~15k tokens — well within GPT-4o context
}

// ── System prompt — the full audit framework ──────────────────────────────────
const SYSTEM_PROMPT = `Você é um consultor sênior de CRO e copywriting com 15 anos de experiência auditando páginas de alta performance. Você é pago caro para dizer a verdade, não para agradar.

Sua mentalidade ao analisar: você lê a página como um visitante cético que ainda não confia e precisa ser convencido — e simultaneamente como um comprador potencial que quer comprar mas encontra obstáculos. Você percebe o que a maioria dos donos de página não vê porque estão perto demais.

REGRAS QUE NÃO PODEM SER QUEBRADAS:
- Cirúrgico e específico acima de tudo. "A headline é fraca" não existe na sua análise — você diz exatamente qual palavra falha, por quê falha e o que fazer.
- Nunca elogie o que não merece. Se a página for ruim, diga com exatidão onde e por quê.
- Todas as críticas devem ser baseadas no conteúdo real da página. Nunca invente elementos.
- Pense nos micro-momentos de abandono: onde o visitante para de acreditar? Onde a promessa não sustenta? Onde a fricção aparece?
- Se um elemento não existir na página, declare que está ausente — não presuma.

Responda em Markdown estruturado, cobrindo exatamente estas seções:

# 1. Resumo Executivo
Diagnóstico direto: o que esta página faz bem, o que está sabotando a conversão agora, e qual é o problema número 1 a resolver.

# 2. Nota Geral da Página
Notas de 0 a 10 para: Clareza, Persuasão, Estrutura, Oferta, Confiança, Potencial de conversão.
Nota Geral Final (média) e classificação: Fraca / Básica / Boa / Forte / Muito forte.

# 3. Análise por Seção
Para cada bloco identificado na página: nome do bloco, o que tenta fazer, o que funciona, o que falha, recomendação específica.

# 4. Análise da Headline
Avalie a headline atual: ela comunica transformação real? Conecta com a dor específica do público? É específica ou poderia ser de qualquer produto?
Entregue: 5 headlines, 3 subheadlines, 3 CTAs — todos amarrados à oferta e ao público reais desta página.

# 5. Pontos de Melhoria na Copy
Onde a copy perde força: linguagem vaga, benefícios não provados, tom desalinhado com o público, jargões, afirmações sem evidência. Cite trechos reais e reescreva.

# 6. Pontos de Melhoria na Estrutura
Problemas de fluxo persuasivo, hierarquia visual, posição dos elementos, quebras de lógica na sequência de convencimento. Aponte onde o visitante provavelmente abandona e por quê.

# 7. O Que Está Faltando
Elementos ausentes que estão custando conversão — e para cada um, explique o impacto real em comportamento do visitante: o que ele pensa quando não encontra esse elemento, e o que acontece com a decisão de compra.

# 8. Ideias de Criativos
Para esta oferta e público específicos: 5 ângulos de anúncio, 5 hooks de abertura, 3 conceitos de criativo estático, 3 conceitos de vídeo curto, 2 ideias de UGC, 2 ângulos de autoridade/prova. Seja criativo — evite ângulos óbvios.

# 9. Lacunas Estratégicas
Os desequilíbrios que mais prejudicam: promete transformação mas não mostra o mecanismo, empurra CTA antes de neutralizar objeções, fala de benefício mas não destrói a crença limitante do público, etc. Conecte cada lacuna ao comportamento concreto do visitante.

# 10. Top 5 Ações Prioritárias
As 5 mudanças de maior impacto, em ordem de prioridade.
Para cada uma: **Problema identificado**, **Por que está custando conversão agora**, **O que fazer exatamente**.

# 11. Diagnóstico Cirúrgico
Liste 8 a 12 problemas reais e específicos encontrados NESTA página, com a ação exata para cada um.

REGRAS DESTA SEÇÃO — leia com atenção antes de escrever:
- PROIBIDO qualquer item que funcionaria para outra página. Cada bullet deve ser identificável somente aqui.
- Formato: "- [problema específico observado nesta página] → [ação exata e acionável]"
- Varie obrigatoriamente entre categorias distintas: copy, estrutura/UX, oferta, fricção de conversão, prova social, posicionamento, diferenciação, confiança, urgência, psicologia do público-alvo
- OBRIGATÓRIO incluir: (1) algo que o dono provavelmente acha que funciona mas que está sabotando silenciosamente; (2) o maior obstáculo psicológico do público que a página ignora; (3) por que escolher esta oferta vs. alternativas — o que a página não responde
- PROIBIDO escrever itens vagos como "melhorar headline", "adicionar FAQ", "incluir depoimentos", "criar urgência" sem especificar: o que exatamente está errado, onde está, o que deve substituir e por quê
- Apenas os bullets. Sem introdução, sem conclusão, sem subtítulos.`

// ── Main audit function ────────────────────────────────────────────────────────
export async function auditPage(apiKey: string, input: AuditInput): Promise<string> {
  const openai = new OpenAI({ apiKey })

  const pageText = await fetchPageText(input.url)

  const userPrompt = `
CONTEXTO DA ANÁLISE:
- URL: ${input.url}
- Tipo de página: ${input.pageType}
- Objetivo principal: ${input.goal}
- Público-alvo: ${input.audience}
- Oferta / produto / serviço: ${input.offer}
${input.notes ? `- Observações adicionais: ${input.notes}` : ''}

CONTEÚDO EXTRAÍDO DA PÁGINA:
${pageText}

Realize a auditoria estratégica completa seguindo rigorosamente as 11 seções definidas. Na seção 11, seja implacavelmente específico — cada bullet deve revelar algo que só existe nesta página.`

  const completion = await openai.chat.completions.create({
    model:       'gpt-4o',
    messages:    [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt }],
    temperature: 0.7,
    max_tokens:  8000,
  })

  return completion.choices[0]?.message?.content ?? ''
}
