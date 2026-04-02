import OpenAI from 'openai'

// ── Persona shape (mirrors Prisma model) ──────────────────────────────────────
export interface CopyPersonaData {
  expertName:       string
  niche:            string
  targetAvatar:     string
  corePromise:      string
  toneOfVoice:      string
  writingStyle:     string
  painPoints:       string
  objections:       string
  uniqueMechanism:  string
  socialProof:      string
  vocabulary:       string
  avoidVocabulary:  string
  copyReferences:   string
  products:         string
  pricePositioning: string
  ctaStyle:         string
  brandValues:      string
  competitors:      string
}

// ── Copy types ────────────────────────────────────────────────────────────────
export type CopyType = 'vsl' | 'email' | 'ad' | 'salespage' | 'capturepage'

export type EmailSubtype = 'cold' | 'nurture' | 'launch' | 'cart-open' | 'cart-close' | 'reengagement'
export type AdSubtype    = 'facebook' | 'instagram' | 'youtube-skippable' | 'youtube-bumper'
export type CopySubtype  = EmailSubtype | AdSubtype | ''

// ── Result shapes ─────────────────────────────────────────────────────────────
export interface VslResult {
  hook:          string
  problema:      string
  agitacao:      string
  mecanismo:     string
  prova_social:  string
  oferta:        string
  bonus:         string
  garantia:      string
  urgencia:      string
  cta:           string
}

export interface EmailResult {
  assuntos:  string[]
  preview:   string
  corpo:     string
  cta:       string
}

// ── Ad: 5 variations per element, each with the copy + angle explanation ──────
export interface AdVariation {
  texto:  string   // the actual copy text
  angulo: string   // short explanation of the strategic angle used
}

export interface AdResult {
  headlines:  AdVariation[]   // 5 headlines
  textos:     AdVariation[]   // 5 primary texts (body copy)
  titulos:    AdVariation[]   // 5 titles (max 30 chars)
  descricoes: AdVariation[]   // 5 descriptions (max 30 chars)
  ctas:       AdVariation[]   // 5 CTAs
}

export interface SalesPageResult {
  hero_headline:      string
  hero_subheadline:   string
  problema:           string
  agitacao:           string
  mecanismo:          string
  para_quem:          string
  o_que_voce_vai_ter: string
  prova_social:       string
  oferta:             string
  bonus:              string
  garantia:           string
  faq:                string
  cta_principal:      string
}

export interface CapturePageResult {
  headline:      string
  subheadline:   string
  bullets:       string[]
  cta_botao:     string
  credibilidade: string
}

export type CopyResult = VslResult | EmailResult | AdResult | SalesPageResult | CapturePageResult

// ── Build the expert persona block ────────────────────────────────────────────
function buildPersonaBlock(p: CopyPersonaData): string {
  const lines: string[] = [
    `EXPERT: ${p.expertName}`,
    `NICHO: ${p.niche}`,
    ``,
    `AVATAR IDEAL:`,
    p.targetAvatar,
    ``,
    `TRANSFORMAÇÃO/PROMESSA CENTRAL:`,
    p.corePromise,
    ``,
    `TOM DE VOZ: ${p.toneOfVoice}`,
    `ESTILO DE ESCRITA: ${p.writingStyle}`,
    ``,
    `DORES PRINCIPAIS DA AUDIÊNCIA:`,
    p.painPoints,
    ``,
    `OBJEÇÕES COMUNS E COMO O EXPERT RESPONDE:`,
    p.objections,
    ``,
    `MECANISMO ÚNICO / MÉTODO PROPRIETÁRIO:`,
    p.uniqueMechanism,
    ``,
    `PROVA SOCIAL (resultados, números, depoimentos):`,
    p.socialProof,
    ``,
    `VOCABULÁRIO CARACTERÍSTICO (USE ESSES TERMOS):`,
    p.vocabulary,
  ]

  if (p.avoidVocabulary)   lines.push(``, `VOCABULÁRIO A EVITAR:`, p.avoidVocabulary)
  if (p.products)          lines.push(``, `PRODUTOS/OFERTAS:`, p.products)
  if (p.pricePositioning)  lines.push(``, `POSICIONAMENTO DE PREÇO:`, p.pricePositioning)
  if (p.ctaStyle)          lines.push(``, `ESTILO DE CTA DO EXPERT:`, p.ctaStyle)
  if (p.brandValues)       lines.push(``, `VALORES E POSICIONAMENTO DE MARCA:`, p.brandValues)
  if (p.competitors)       lines.push(``, `DIFERENCIAÇÃO DE CONCORRENTES:`, p.competitors)
  if (p.copyReferences)    lines.push(``, `REFERÊNCIAS DE COPY (CALIBRE O ESTILO):`, p.copyReferences)

  return lines.join('\n')
}

// ── Type-specific instructions + JSON schema ──────────────────────────────────
function buildTypeInstructions(type: CopyType, subtype: string): string {
  switch (type) {

    case 'vsl':
      return `Escreva um script completo de VSL (Video Sales Letter) seguindo a estrutura clássica de alta conversão.
Cada seção deve ser escrita em prosa corrida (não bullets), pronta para ser lida em câmera.

Retorne JSON com exatamente estas chaves:
{
  "hook":         "Abertura de 15-30s que prende pelo problema, provocação ou história. Sem apresentação.",
  "problema":     "Aprofunda a dor principal do avatar. 60-90s.",
  "agitacao":     "Amplifica as consequências de não resolver. Cria urgência emocional. 60s.",
  "mecanismo":    "Apresenta o mecanismo único/método do expert. Por que ele é diferente. 90-120s.",
  "prova_social": "Resultados concretos, depoimentos, números. 60s.",
  "oferta":       "Apresenta o produto/serviço, o que inclui. 60s.",
  "bonus":        "Bônus e seu valor real. Por que aumentam o valor da oferta. 30-45s.",
  "garantia":     "Garantia e como ela inverte o risco. 20-30s.",
  "urgencia":     "Motivo real de escassez/urgência. 20-30s.",
  "cta":          "CTA claro e direto. Repete a transformação. 20s."
}`

    case 'email': {
      const emailLabels: Record<string, string> = {
        'cold':         'e-mail frio de prospecção',
        'nurture':      'e-mail de nutrição/relacionamento',
        'launch':       'e-mail de lançamento/aquecimento',
        'cart-open':    'e-mail de abertura de carrinho',
        'cart-close':   'e-mail de fechamento de carrinho (urgência máxima)',
        'reengagement': 'e-mail de reengajamento de lista fria',
      }
      const emailLabel = emailLabels[subtype] || 'e-mail de marketing'
      return `Escreva um ${emailLabel} de alta conversão.
O corpo do e-mail deve usar quebras de linha, ser escaneável e empático com o avatar.

Retorne JSON com exatamente estas chaves:
{
  "assuntos":  ["assunto 1 — curiosidade", "assunto 2 — benefício direto", "assunto 3 — provocação/dor"],
  "preview":   "Texto de pré-header que complementa o assunto (max 90 chars)",
  "corpo":     "Corpo completo do e-mail com parágrafos curtos e quebras de linha (use \\n\\n entre parágrafos)",
  "cta":       "Linha de CTA — texto do link/botão + frase de apoio"
}`
    }

    case 'ad': {
      const adLabels: Record<string, string> = {
        'facebook':           'anúncio para Feed do Facebook',
        'instagram':          'anúncio para Feed/Stories do Instagram',
        'youtube-skippable':  'roteiro de anúncio YouTube skippable (15-60s)',
        'youtube-bumper':     'roteiro de anúncio YouTube bumper (6s não-pulável)',
      }
      const adLabel = adLabels[subtype] || 'anúncio de tráfego pago'
      return `Crie um pacote completo de ${adLabel} com 5 variações distintas para cada elemento, prontas para teste A/B.

REGRAS OBRIGATÓRIAS:
- Cada variação deve usar um ângulo psicológico DIFERENTE — não repita o mesmo approach
- Os 5 ângulos obrigatórios são (um por variação, nesta ordem): Dor Direta · Curiosidade/Intriga · Prova Social · Storytelling · Disruptivo/Provocação
- Textos primários: use emojis com critério, parágrafos separados por \\n\\n, tom conversacional e descontraído
- Textos primários: mínimo 4 parágrafos por variação, escritos como post orgânico — não como anúncio óbvio
- Títulos: MÁXIMO 30 caracteres — conte os caracteres antes de responder
- Descrições: MÁXIMO 30 caracteres — conte os caracteres antes de responder
- CTAs: variados psicologicamente (urgência, benefício, identidade, curiosidade, inversão de risco)
- Para cada variação informe o "angulo": 1 frase explicando a estratégia por trás daquele copy

Retorne JSON com exatamente esta estrutura:
{
  "headlines": [
    { "texto": "headline ângulo dor direta",      "angulo": "Ângulo Dor Direta — [explica a estratégia em 1 frase]" },
    { "texto": "headline ângulo curiosidade",      "angulo": "Ângulo Curiosidade — [explica]" },
    { "texto": "headline ângulo prova social",     "angulo": "Ângulo Prova Social — [explica]" },
    { "texto": "headline ângulo storytelling",     "angulo": "Ângulo Storytelling — [explica]" },
    { "texto": "headline ângulo disruptivo",       "angulo": "Ângulo Disruptivo — [explica]" }
  ],
  "textos": [
    { "texto": "texto primário completo ângulo dor\\n\\nparágrafo 2\\n\\nparágrafo 3\\n\\nparágrafo 4", "angulo": "Ângulo Dor Direta — [explica]" },
    { "texto": "texto ângulo curiosidade...", "angulo": "Ângulo Curiosidade — [explica]" },
    { "texto": "texto ângulo prova social...", "angulo": "Ângulo Prova Social — [explica]" },
    { "texto": "texto ângulo storytelling...", "angulo": "Ângulo Storytelling — [explica]" },
    { "texto": "texto ângulo disruptivo...", "angulo": "Ângulo Disruptivo — [explica]" }
  ],
  "titulos": [
    { "texto": "máx 30 chars", "angulo": "Ângulo Dor Direta — [explica]" },
    { "texto": "máx 30 chars", "angulo": "Ângulo Curiosidade — [explica]" },
    { "texto": "máx 30 chars", "angulo": "Ângulo Prova Social — [explica]" },
    { "texto": "máx 30 chars", "angulo": "Ângulo Storytelling — [explica]" },
    { "texto": "máx 30 chars", "angulo": "Ângulo Disruptivo — [explica]" }
  ],
  "descricoes": [
    { "texto": "máx 30 chars", "angulo": "Ângulo Dor Direta — [explica]" },
    { "texto": "máx 30 chars", "angulo": "Ângulo Curiosidade — [explica]" },
    { "texto": "máx 30 chars", "angulo": "Ângulo Prova Social — [explica]" },
    { "texto": "máx 30 chars", "angulo": "Ângulo Storytelling — [explica]" },
    { "texto": "máx 30 chars", "angulo": "Ângulo Disruptivo — [explica]" }
  ],
  "ctas": [
    { "texto": "CTA urgência",         "angulo": "Urgência — [explica]" },
    { "texto": "CTA benefício direto", "angulo": "Benefício — [explica]" },
    { "texto": "CTA identidade",       "angulo": "Identidade — [explica]" },
    { "texto": "CTA curiosidade",      "angulo": "Curiosidade — [explica]" },
    { "texto": "CTA inversão de risco","angulo": "Inversão de Risco — [explica]" }
  ]
}`
    }

    case 'salespage':
      return `Escreva o copy completo de uma página de vendas de alta conversão.
Cada seção deve ser texto pronto para publicar. Use emoção, lógica e urgência na medida certa.

Retorne JSON com exatamente estas chaves:
{
  "hero_headline":      "Headline principal — promessa de transformação em até 12 palavras",
  "hero_subheadline":   "Subheadline que expande e qualifica a promessa — 1-2 linhas",
  "problema":           "Seção que espelha a dor do avatar. Ele deve se reconhecer aqui.",
  "agitacao":           "Aprofunda as consequências. Cria urgência emocional sem manipular.",
  "mecanismo":          "Apresenta o método/solução única. Por que é diferente de tudo que ele já tentou.",
  "para_quem":          "Bullets de para quem é e para quem NÃO é. Filtra e qualifica.",
  "o_que_voce_vai_ter": "Bullets do que está incluído — entregáveis com contexto de valor.",
  "prova_social":       "Bloco de depoimentos/resultados formatado para copy.",
  "oferta":             "Apresentação da oferta completa com ancoragem de preço.",
  "bonus":              "Bônus com nome, descrição e valor unitário de cada um.",
  "garantia":           "Copy da garantia — inversão de risco + reforço da confiança.",
  "faq":                "5-7 perguntas frequentes com respostas que quebram objeções.",
  "cta_principal":      "CTA de fechamento — urgência + transformação + instrução de ação"
}`

    case 'capturepage':
      return `Escreva o copy completo de uma página de captura (opt-in) otimizada para conversão.
O objetivo é conseguir o e-mail/WhatsApp em troca de uma isca digital ou promessa.

Retorne JSON com exatamente estas chaves:
{
  "headline":      "Headline de captura — promessa clara e específica em até 10 palavras",
  "subheadline":   "Subheadline que explica O QUE e PARA QUEM — 1-2 linhas",
  "bullets":       ["benefício 1 específico", "benefício 2 específico", "benefício 3 específico", "benefício 4 com urgência/exclusividade"],
  "cta_botao":     "Texto do botão de CTA (primeira pessoa: 'Quero acesso agora' / 'Me envia agora')",
  "credibilidade": "Linha de credibilidade abaixo do formulário — números, mídia, garantia de privacidade"
}`

    default:
      return ''
  }
}

// ── Main generation function ──────────────────────────────────────────────────
export async function generateCopy(
  apiKey:  string,
  persona: CopyPersonaData,
  type:    CopyType,
  subtype: string,
  brief:   string,
): Promise<CopyResult> {
  const openai = new OpenAI({ apiKey })

  const systemPrompt = `Você é um copywriter de elite especializado em infomercado brasileiro.
Você escreveu copies que geraram mais de R$100M em vendas diretas.
Você domina profundamente: AIDA, PAS, 4 U's, Russell Brunson DotCom Secrets, Jeff Walker PLF, Gary Halbert e David Ogilvy.

Sua tarefa: escrever copy no tom e estilo exato do expert abaixo, como se fosse ele mesmo escrevendo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERSONA DO EXPERT — calibre TUDO com base nisso:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${buildPersonaBlock(persona)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REGRAS INVIOLÁVEIS:
- Tom e vocabulário devem ser indistinguíveis do expert — quem lê deve sentir que foi ele quem escreveu
- Nunca use clichês genéricos de copy ("você merece", "está cansado de", "descubra o segredo")
- Use linguagem coloquial brasileira quando o tom do expert pede — não force formalidade
- Cada seção deve ser substancial e completa, não um rascunho
- Para anúncios: textos primários devem soar como post orgânico, não como propaganda óbvia
- Retorne APENAS JSON válido, sem texto fora do JSON`

  const typeInstructions = buildTypeInstructions(type, subtype)

  const userPrompt = `${typeInstructions}

BRIEFING ESPECÍFICO PARA ESTA GERAÇÃO:
${brief || 'Gere o copy com base na persona e no produto principal descrito no perfil.'}`

  const completion = await openai.chat.completions.create({
    model:           'gpt-4o',
    messages:        [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature:     0.82,
    max_tokens:      6000,
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'
  return JSON.parse(raw) as CopyResult
}

// ── Refine a single ad item with user comment ─────────────────────────────────
export async function refineAdItem(
  apiKey:       string,
  persona:      CopyPersonaData,
  subtype:      string,
  itemType:     'headline' | 'texto' | 'titulo' | 'descricao' | 'cta',
  originalText: string,
  originalAngulo: string,
  comment:      string,
): Promise<AdVariation> {
  const openai = new OpenAI({ apiKey })

  const itemLabels: Record<string, string> = {
    headline:  'headline de anúncio',
    texto:     'texto primário (body copy) de anúncio',
    titulo:    'título de anúncio (máx 30 caracteres)',
    descricao: 'descrição de anúncio (máx 30 caracteres)',
    cta:       'CTA de anúncio',
  }

  const adLabels: Record<string, string> = {
    'facebook':           'Feed do Facebook',
    'instagram':          'Feed/Stories do Instagram',
    'youtube-skippable':  'YouTube skippable',
    'youtube-bumper':     'YouTube bumper 6s',
  }

  const systemPrompt = `Você é um copywriter de elite especializado em infomercado brasileiro.
Você está refinando um copy existente com base no feedback do usuário.

PERSONA DO EXPERT:
${buildPersonaBlock(persona)}

REGRAS:
- Mantenha o tom e vocabulário do expert
- Aplique o feedback sem perder o que já funcionava no texto original
- Para títulos e descrições: respeite ESTRITAMENTE o limite de 30 caracteres
- Para textos primários: mantenha emojis, espaçamento e tom conversacional
- Retorne APENAS JSON válido`

  const userPrompt = `Refine este ${itemLabels[itemType] || itemType} para anúncio de ${adLabels[subtype] || 'tráfego pago'}.

TEXTO ORIGINAL:
${originalText}

ÂNGULO ORIGINAL:
${originalAngulo}

FEEDBACK / INSTRUÇÃO DE REFINAMENTO:
${comment}

Retorne JSON com exatamente estas chaves:
{
  "texto":  "o texto refinado aplicando o feedback",
  "angulo": "breve explicação do ângulo/estratégia desta versão refinada"
}`

  const completion = await openai.chat.completions.create({
    model:           'gpt-4o',
    messages:        [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature:     0.8,
    max_tokens:      1500,
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'
  return JSON.parse(raw) as AdVariation
}
