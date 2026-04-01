import OpenAI from 'openai'
import { PROFILES } from './profiles'
export { PROFILES }

export interface GenerateInput {
  transcript:    string
  profile:       string
  youtuberName?: string  // included in descriptions
  instagram?:    string  // @handle — included in descriptions
  notes?:        string  // extra context/instructions
  customPrompt?: string  // overrides profile if set in settings
}

export interface VideoSummary {
  resumo_texto:         string     // short narrative summary, 2-4 sentences
  pontos_chave:         string[]   // key points from the video
  mencoes_importantes:  string[]   // tools, links, products, channels mentioned
  acoes_pendentes:      string[]   // things the YouTuber said they'd add to description / show notes
}

export interface GenerateResult {
  titles:       string[]   // exactly 5
  descriptions: string[]   // exactly 3, with spacing + emojis
  hashtags:     string[]   // exactly 10
  tags:         string[]   // exactly 10
  summary:      VideoSummary
}

export async function generateYoutubeContent(apiKey: string, input: GenerateInput): Promise<GenerateResult> {
  const openai  = new OpenAI({ apiKey })
  const profile = PROFILES[input.profile] ?? PROFILES['youtube-seo']

  const baseInstruction = input.customPrompt?.trim() || profile.instruction

  // Build context block from optional fields
  const contextLines: string[] = []
  if (input.youtuberName) contextLines.push(`Nome do YouTuber: ${input.youtuberName}`)
  if (input.instagram)    contextLines.push(`Instagram: ${input.instagram}`)
  if (input.notes)        contextLines.push(`Anotações importantes: ${input.notes}`)
  const contextBlock = contextLines.length
    ? `\nCONTEXTO ADICIONAL:\n${contextLines.join('\n')}\n`
    : ''

  // Instagram mention to embed in descriptions
  const igMention = input.instagram
    ? `\n\n📸 Me siga no Instagram: ${input.instagram.startsWith('@') ? input.instagram : '@' + input.instagram}`
    : ''

  const systemPrompt = `Você é um especialista em conteúdo para YouTube com foco em resultados reais.

${baseInstruction}

REGRAS DE OUTPUT — siga à risca:
- Gere EXATAMENTE 5 títulos
- Gere EXATAMENTE 3 descrições completas, com espaçamento entre parágrafos (use \\n\\n), emojis relevantes para tornar a leitura dinâmica e chamativa${input.instagram ? `, e inclua ao final de cada descrição: "${igMention}"` : ''}
- Gere EXATAMENTE 10 hashtags — formato: "hashtag1, hashtag2, hashtag3" (sem # e sem lista vertical)
- Gere EXATAMENTE 10 tags (palavras-chave para o campo de tags do YouTube)
- Retorne APENAS um JSON válido, sem texto adicional

ESTRUTURA JSON exata:
{
  "titles": ["título1","título2","título3","título4","título5"],
  "descriptions": ["descrição 1 completa","descrição 2 completa","descrição 3 completa"],
  "hashtags": ["hashtag1, hashtag2, hashtag3, hashtag4, hashtag5, hashtag6, hashtag7, hashtag8, hashtag9, hashtag10"],
  "tags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10"],
  "summary": {
    "resumo_texto": "Parágrafo corrido de 2 a 4 frases resumindo o conteúdo do vídeo.",
    "pontos_chave": ["ponto 1","ponto 2","..."],
    "mencoes_importantes": ["Ferramenta X — breve contexto","Link Y mencionado","Canal Z citado"],
    "acoes_pendentes": ["Disse que vai colocar o link do curso na descrição","Mencionou que vai disponibilizar planilha nos comentários"]
  }
}

REGRAS para o campo "summary":
- "resumo_texto": escreva um parágrafo corrido de 2 a 4 frases que capture o tema central, o público-alvo e o principal valor entregue pelo vídeo — sem bullet points, texto fluido e direto
- "pontos_chave": liste entre 3 e 7 insights ou tópicos principais do vídeo, em frases curtas e diretas
- "mencoes_importantes": capture TODAS as ferramentas, produtos, links, canais, livros ou referências externas citados — inclua contexto mínimo
- "acoes_pendentes": capture EXATAMENTE quando o YouTuber disser que vai colocar algo na descrição, nos comentários ou no link da bio (ex: "vou deixar aqui na descrição", "link nos comentários", "coloca na bio") — se não houver nenhuma, retorne array vazio`

  const userPrompt = `TRANSCRIÇÃO:
${input.transcript.slice(0, 8000)}
${contextBlock}
Analise o conteúdo acima, identifique o tema, tom de voz e palavra-chave principal, e gere todo o material seguindo rigorosamente as regras e o estilo definidos.`

  const completion = await openai.chat.completions.create({
    model:           'gpt-4o',
    messages:        [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    response_format: { type: 'json_object' },
    temperature:     0.75,
  })

  const raw    = completion.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw) as Partial<GenerateResult>

  const rawSummary = (parsed as any).summary ?? {}

  return {
    titles:       (parsed.titles       ?? []).slice(0, 5),
    descriptions: (parsed.descriptions ?? []).slice(0, 3),
    hashtags:     parsed.hashtags ?? [],
    tags:         (parsed.tags         ?? []).slice(0, 10),
    summary: {
      resumo_texto:        rawSummary.resumo_texto        ?? '',
      pontos_chave:        rawSummary.pontos_chave        ?? [],
      mencoes_importantes: rawSummary.mencoes_importantes ?? [],
      acoes_pendentes:     rawSummary.acoes_pendentes     ?? [],
    },
  }
}
