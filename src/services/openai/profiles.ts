// Profiles are plain data — no Node.js imports, safe for client-side use.
export const PROFILES: Record<string, { name: string; desc: string; instruction: string }> = {
  'youtube-seo': {
    name: 'YouTube SEO',
    desc: 'Ranqueamento orgânico — longo prazo',
    instruction: `Foco em ranqueamento orgânico de longo prazo.
- Títulos: palavra-chave principal nos primeiros 40 caracteres, naturais e sem forçar
- Descrições: palavra-chave principal nas primeiras 2 frases, variações ao longo do texto, linguagem clara e informativa
- Estrutura de descrição rica com seções bem definidas (O que vai aprender, recursos, sobre o canal)
- Hashtags e tags com alto volume de busca e relevância temática
- Tom: profissional, claro, direto`,
  },

  'youtube-ctr': {
    name: 'YouTube CTR',
    desc: 'Máximo de cliques — gancho irresistível',
    instruction: `Foco total em CTR e cliques.
- Títulos: ganchos fortes com curiosidade, números, urgência ou promessa clara — no limite do clickbait inteligente (a promessa deve estar no vídeo)
- Descrições: primeiro parágrafo EXPLOSIVO — 2 linhas que façam o visitante querer assistir imediatamente; use perguntas retóricas, afirmações surpreendentes ou revelações parciais
- Emojis estratégicos para quebrar o texto e chamar atenção visual
- CTAs diretos: "Assista AGORA", "Você PRECISA ver isso"
- Tom: energético, urgente, empolgante`,
  },

  'shorts': {
    name: 'YouTube Shorts',
    desc: 'Formato curto — viral e direto',
    instruction: `Otimizado para YouTube Shorts e descoberta rápida.
- Títulos: máximo 60 caracteres, impacto imediato, sem enrolação
- Descrições: máximo 200 palavras, gancho na primeira linha, hashtags com foco em trending
- Emojis em abundância para ritmo visual rápido
- Hashtags voltadas para viralização: trending topics, challenges, descoberta
- Tom: rápido, dinâmico, direto ao ponto`,
  },

  'educacional': {
    name: 'Educacional',
    desc: 'Tutoriais e conteúdo didático',
    instruction: `Foco em conteúdo educativo e tutoriais.
- Títulos: "Como...", "Aprenda...", "Passo a passo para...", com resultado claro prometido
- Descrições: estruturadas como aula — explique O QUE o viewer vai saber/conseguir fazer após o vídeo, liste os pré-requisitos se houver, destaque ferramentas e recursos usados
- Inclua sempre seção de recursos/links pois viewers educacionais buscam materiais extras
- Tags focadas em buscas de aprendizado: "como fazer X", "tutorial X para iniciantes", "aprenda X"
- Tom: didático, paciente, encorajador`,
  },
}
