import OpenAI from 'openai'

export interface ClipSuggestion {
  id:        string
  startTime: number   // seconds
  endTime:   number   // seconds
  title:     string
  hook:      string   // opening line / why it's good
  score:     number   // 1–10
}

const SYSTEM_PROMPT = `Você é um editor de vídeo especialista em criar cortes virais para redes sociais.
Analisa transcrições de vídeos longos e identifica os trechos mais impactantes e auto-suficientes.

Um bom clip obrigatoriamente:
- Abre com uma frase de impacto — sem "como eu dizia", sem contexto prévio necessário
- É auto-suficiente: quem não viu o vídeo inteiro entende e se interessa
- Cobre UMA ideia, insight, história ou virada completa
- Tem entre 30 e 120 segundos de duração (CRÍTICO — fora disso não serve)
- Tem alto potencial de compartilhamento: insight surpreendente, punch emocional, dica acionável ou posicionamento forte

Retorne SOMENTE JSON válido. Nenhum texto fora do JSON.`

function buildPrompt(timedText: string, duration: number): string {
  return `TRANSCRIÇÃO COM TIMESTAMPS:
${timedText}

Duração total do vídeo: ${Math.round(duration)}s

Identifique de 5 a 8 clips. Para cada um retorne:
- startTime: number (segundos — alinhe com o início de um segmento da transcrição)
- endTime:   number (segundos — alinhe com o fim de um segmento da transcrição)
- title:     string (máx 60 chars, título descritivo do clip)
- hook:      string (a frase exata de abertura do clip — deve ser um gancho forte)
- score:     number (1–10, onde 10 = viral garantido, 7+ = clip forte)

Regras:
- Duração de cada clip: entre 30s e 120s (endTime - startTime)
- Clips não podem se sobrepor
- startTime/endTime devem coincidir com fronteiras de segmentos da transcrição acima
- Retorne array JSON. Nenhum outro texto.

Exemplo:
[
  {
    "startTime": 45.2,
    "endTime": 112.8,
    "title": "O método que triplicou meu faturamento",
    "hook": "A maioria das pessoas faz isso completamente ao contrário.",
    "score": 9
  }
]`
}

export async function analyzeClips(
  apiKey:    string,
  timedText: string,
  duration:  number,
): Promise<ClipSuggestion[]> {
  const openai = new OpenAI({ apiKey })

  const completion = await openai.chat.completions.create({
    model:           'gpt-4o',
    messages:        [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: buildPrompt(timedText, duration) },
    ],
    temperature:     0.4,
    max_tokens:      2000,
    response_format: { type: 'json_object' },
  })

  const raw    = completion.choices[0]?.message?.content ?? '[]'
  const parsed = JSON.parse(raw)
  const arr: Omit<ClipSuggestion, 'id'>[] = Array.isArray(parsed)
    ? parsed
    : (parsed.clips ?? parsed.data ?? [])

  return arr.map((c, i) => ({
    ...c,
    id:        `clip-${i + 1}`,
    startTime: Number(c.startTime),
    endTime:   Number(c.endTime),
    score:     Math.min(10, Math.max(1, Number(c.score))),
  }))
}
