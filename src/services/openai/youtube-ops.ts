import OpenAI from 'openai'
import { PROFILES } from './profiles'
export { PROFILES }

export interface GenerateInput {
  transcript:    string
  profile:       string
  youtuberName?: string
  instagram?:    string
  notes?:        string
  customPrompt?: string
}

export interface VideoSummary {
  resumo_texto:        string
  pontos_chave:        string[]
  mencoes_importantes: string[]
  acoes_pendentes:     string[]
}

export interface GenerateResult {
  titles:       string[]
  descriptions: string[]
  hashtags:     string[]
  tags:         string[]
  summary:      VideoSummary
}

export async function generateYoutubeContent(apiKey: string, input: GenerateInput): Promise<GenerateResult> {
  const openai  = new OpenAI({ apiKey })
  const profile = PROFILES[input.profile] ?? PROFILES['youtube-seo']

  const baseInstruction = input.customPrompt?.trim() || profile.instruction

  const igMention = input.instagram
    ? `📸 Me siga no Instagram: ${input.instagram.startsWith('@') ? input.instagram : '@' + input.instagram}`
    : ''

  const contextLines: string[] = []
  if (input.youtuberName) contextLines.push(`Nome do YouTuber/Canal: ${input.youtuberName}`)
  if (input.instagram)    contextLines.push(`Instagram: ${input.instagram}`)
  if (input.notes)        contextLines.push(`Notas e contexto extra: ${input.notes}`)
  const contextBlock = contextLines.length
    ? `\nCONTEXTO DO CANAL:\n${contextLines.join('\n')}\n`
    : ''

  const systemPrompt = `Você é um especialista sênior em YouTube com mais de 10 anos de experiência em otimização de conteúdo, SEO e crescimento de canais.

ESTILO DO CONTEÚDO:
${baseInstruction}

═══════════════════════════════════════════════
REGRAS DE TÍTULOS (gere EXATAMENTE 5)
═══════════════════════════════════════════════
- Entre 50-70 caracteres cada
- Inclua a palavra-chave principal nos primeiros 3 títulos
- Varie os formatos: "Como...", "X Motivos...", pergunta direta, afirmação impactante, promessa de resultado
- Sem clickbait vazio — a promessa deve estar no conteúdo
- Nenhum título idêntico em estrutura

═══════════════════════════════════════════════
REGRAS DE DESCRIÇÕES (gere EXATAMENTE 3)
═══════════════════════════════════════════════
Cada descrição deve ter NO MÍNIMO 400 palavras e seguir ESTA estrutura obrigatória:

[GANCHO — 2 a 3 linhas visíveis antes do "ver mais"]
Frase de impacto que capture exatamente do que trata o vídeo e por que vale assistir. Use a palavra-chave principal aqui.

📌 O QUE VOCÊ VAI APRENDER:
• [Ponto principal extraído do conteúdo real do vídeo]
• [Ponto 2 extraído do conteúdo real]
• [Ponto 3 extraído do conteúdo real]
• [Ponto 4 se houver]
• [Ponto 5 se houver]

[DESENVOLVIMENTO — 2 a 3 parágrafos detalhando o conteúdo do vídeo]
Escreva um resumo rico do que foi abordado: contexto, metodologia, exemplos reais mencionados, insights relevantes. Seja específico — mencione nomes, números, ferramentas ou situações reais citadas na transcrição.

⚡ [SEÇÃO RECURSOS/LINKS — se mencionados na transcrição]
Quando o YouTuber mencionar links, planilhas, cursos, materiais ou ferramentas:
→ [Nome do recurso]: [LINK_AQUI]
Caso contrário, omita essa seção completamente.

[SOBRE O CANAL — 1 parágrafo]
Breve apresentação do canal e do tema central${input.youtuberName ? ` do ${input.youtuberName}` : ''}, naturalmente integrada. Convide o visitante a se inscrever.

🔔 Ative o sininho para não perder os próximos vídeos!
${igMention ? `\n${igMention}` : ''}

[HASHTAGS ao final — 5 hashtags inline como #palavra]

As 3 descrições devem ser DISTINTAS entre si:
- Descrição 1: mais estruturada e rica em SEO
- Descrição 2: mais narrativa e conversacional, como se o próprio YouTuber tivesse escrito
- Descrição 3: mais direta e focada em CTR/resultado imediato

═══════════════════════════════════════════════
REGRAS DE HASHTAGS
═══════════════════════════════════════════════
- Gere EXATAMENTE 10 hashtags
- Formato: "hashtag1, hashtag2, hashtag3" (sem # e sem lista vertical)
- Mix: 3 amplas (tema geral), 4 específicas (tema do vídeo), 3 de nicho/canal

═══════════════════════════════════════════════
REGRAS DE TAGS
═══════════════════════════════════════════════
- Gere EXATAMENTE 15 tags para o campo de tags do YouTube
- Inclua variações da palavra-chave principal, sinônimos, termos relacionados
- Mix de curtas (1-2 palavras) e longas (3-5 palavras)

═══════════════════════════════════════════════
REGRAS DO RESUMO (summary)
═══════════════════════════════════════════════
- "resumo_texto": parágrafo corrido de 3 a 5 frases capturando tema, público-alvo, principais ensinamentos e tom do vídeo
- "pontos_chave": entre 5 e 8 insights ou tópicos, frases completas e específicas (não genéricas)
- "mencoes_importantes": TODAS as ferramentas, produtos, links, canais, livros, marcas, nomes de pessoas ou cursos citados — com contexto mínimo de uso
- "acoes_pendentes": apenas quando o YouTuber EXPLICITAMENTE disser que vai colocar algo na descrição/comentários/bio — cite a frase exata e o que deve ser adicionado; array vazio se não houver

FORMATO DE RESPOSTA:
Retorne APENAS JSON válido, sem texto adicional, sem markdown, sem bloco de código.

{
  "titles": ["t1","t2","t3","t4","t5"],
  "descriptions": ["descrição 1 completa com toda a estrutura","descrição 2","descrição 3"],
  "hashtags": ["tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8, tag9, tag10"],
  "tags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10","tag11","tag12","tag13","tag14","tag15"],
  "summary": {
    "resumo_texto": "...",
    "pontos_chave": ["..."],
    "mencoes_importantes": ["..."],
    "acoes_pendentes": ["..."]
  }
}`

  const userPrompt = `TRANSCRIÇÃO DO VÍDEO:
${input.transcript.slice(0, 12000)}
${contextBlock}
─────────────────────────────────
Leia a transcrição completa acima com atenção. Identifique:
1. O tema central e palavra-chave principal
2. Os pontos específicos abordados (não genéricos)
3. Exemplos, números, nomes ou ferramentas reais mencionados
4. O tom de voz e estilo do criador
5. Qualquer promessa de link/recurso que o YouTuber fez

Gere todo o material seguindo rigorosamente as regras definidas. As descrições devem ser ricas, detalhadas e específicas ao conteúdo desta transcrição — nunca genéricas.`

  const completion = await openai.chat.completions.create({
    model:           'gpt-4o',
    messages:        [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    response_format: { type: 'json_object' },
    temperature:     0.72,
    max_tokens:      4096,
  })

  const raw    = completion.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw) as Partial<GenerateResult>
  const rawSummary = (parsed as { summary?: Partial<VideoSummary> }).summary ?? {}

  return {
    titles:       (parsed.titles       ?? []).slice(0, 5),
    descriptions: (parsed.descriptions ?? []).slice(0, 3),
    hashtags:     parsed.hashtags ?? [],
    tags:         (parsed.tags         ?? []).slice(0, 15),
    summary: {
      resumo_texto:        rawSummary.resumo_texto        ?? '',
      pontos_chave:        rawSummary.pontos_chave        ?? [],
      mencoes_importantes: rawSummary.mencoes_importantes ?? [],
      acoes_pendentes:     rawSummary.acoes_pendentes     ?? [],
    },
  }
}
