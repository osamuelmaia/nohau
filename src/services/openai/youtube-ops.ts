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

  const systemPrompt = `Você é um redator de elite especializado em YouTube — parte copywriter, parte jornalista, parte estrategista de conteúdo. Você entende que uma descrição boa não segue template: ela serve ao conteúdo.

DIREÇÃO DO PERFIL ATIVO:
${baseInstruction}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TÍTULOS — gere EXATAMENTE 5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 50–70 caracteres cada
• Palavra-chave principal em pelo menos 3 deles
• Cada título deve ter uma ABORDAGEM diferente — formato "Como fazer X", número ("X razões pelas quais..."), pergunta direta, afirmação que surpreende, promessa de transformação
• Nenhum título pode começar da mesma forma que outro
• A promessa de cada título deve estar de fato no vídeo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESCRIÇÕES — gere EXATAMENTE 3, radicalmente diferentes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGRA ABSOLUTA: as 3 descrições não podem ter a mesma estrutura, o mesmo tom, nem começar da mesma forma. Se uma usa bullet points, outra não pode usar. Se uma é narrativa, outra deve ser direta. Cada uma deve parecer escrita por uma pessoa diferente, com um objetivo diferente. Quem ler as 3 deve ter a impressão de que são de vídeos distintos — mas todas falam do mesmo conteúdo.

Mínimo 350 palavras por descrição. Seja específico: use nomes, números, situações e exemplos reais que aparecem na transcrição. Jamais escreva algo que poderia servir para qualquer outro vídeo.

DESCRIÇÃO 1 — "O Jornalista"
Escreva como um artigo de revista bem editado. Começa com uma abertura que contextualiza o assunto no mundo real — um dado, uma situação que o leitor reconhece, uma contradição. Sem bullets. Texto fluido, parágrafos bem construídos. O leitor deve sentir que está lendo algo de valor antes mesmo de apertar play. Inclua os detalhes específicos do vídeo como quem está contando uma história.${igMention ? ` Ao final, inclua naturalmente: "${igMention}"` : ''} Feche com 3–4 hashtags integradas organicamente no último parágrafo.

DESCRIÇÃO 2 — "O Especialista Direto"
Sem introdução longa. Sem firula. Vai direto ao que importa: o que está no vídeo, por que vale o tempo de quem vai assistir, e o que a pessoa vai sair sabendo que não sabia antes. Pode usar bullets — mas só se fizer sentido para comunicar os pontos com mais clareza. Denso, preciso, autoridade. Cada parágrafo entrega algo. Se o YouTuber mencionou links, ferramentas ou materiais, liste-os de forma limpa.${igMention ? ` Inclua "${igMention}" onde fizer sentido.` : ''} Hashtags no final, forma padrão (#palavra).

DESCRIÇÃO 3 — "O Criador Humano"
Escreva na voz do próprio criador — informal, direta, como se ele estivesse contando para um amigo o que tem nesse vídeo e por que gravou. Sem template. Sem seções. A personalidade do canal deve aparecer aqui. Pode ter humor, pode ter urgência, pode ter emoção — depende do tom da transcrição. O gancho pode ser uma pergunta, uma confissão, uma provocação, uma promessa. O corpo deve fluir como uma conversa. Fecha com CTA natural e${igMention ? ` "${igMention}" e` : ''} hashtags.

REGRAS QUE VALEM PARA AS 3:
• Específico ao conteúdo desta transcrição — nada que possa ser reaproveitado em outro vídeo
• Se o YouTuber prometeu colocar link/material na descrição, inclua "[LINK_AQUI — ${input.youtuberName ?? 'nome do recurso'}]" no lugar certo
• Palavra-chave principal aparece de forma natural em cada uma, sem forçar

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HASHTAGS — EXATAMENTE 10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Formato: "hashtag1, hashtag2, hashtag3, ..." (sem # e sem lista vertical)
Mix: amplas (tema geral) + específicas (conteúdo do vídeo) + nicho

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TAGS — EXATAMENTE 15
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Para o campo de tags do YouTube. Variações da palavra-chave, sinônimos, termos de busca relacionados. Mix de curtas e longas (3–5 palavras).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUMMARY — resumo interno do vídeo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• "resumo_texto": 3 a 5 frases corridas capturando tema, público, principais ensinamentos e tom — sem bullet points
• "pontos_chave": 5 a 8 insights específicos do vídeo, frases completas (não "o criador fala sobre X" — diga o que ele disse)
• "mencoes_importantes": TUDO que foi citado — ferramentas, produtos, canais, livros, pessoas, marcas, cursos — com contexto mínimo
• "acoes_pendentes": só quando o criador EXPLICITAMENTE disse que vai colocar algo na descrição/comentários/bio. Cite o que foi prometido. Array vazio se não houver nada.

RESPOSTA: apenas JSON válido, sem markdown, sem texto fora do JSON.
{ "titles": [...], "descriptions": [...], "hashtags": [...], "tags": [...], "summary": { "resumo_texto": "...", "pontos_chave": [...], "mencoes_importantes": [...], "acoes_pendentes": [...] } }`

  const userPrompt = `TRANSCRIÇÃO:
${input.transcript.slice(0, 12000)}
${contextBlock}
Antes de escrever qualquer coisa: leia a transcrição inteira. Identifique o tema real, os detalhes específicos (nomes, números, ferramentas, exemplos, situações), o tom de voz do criador, e qualquer promessa de link ou material. Use tudo isso. As 3 descrições devem soar completamente diferentes entre si — em estrutura, em tom e em abordagem. Alguém que ler as 3 deve sentir que foram escritas por pessoas diferentes para propósitos diferentes.`

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
