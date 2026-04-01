// Profiles are plain data — no Node.js imports, safe for client-side use.
export const PROFILES: Record<string, { name: string; desc: string; instruction: string }> = {
  'youtube-seo': {
    name: 'YouTube SEO',
    desc: 'Ranqueamento orgânico — longo prazo',
    instruction: 'Otimize para SEO do YouTube. Títulos com palavra-chave principal de forma natural. Descrições ricas em termos de busca, parágrafos bem estruturados, emojis estratégicos para leitura dinâmica. Hashtags e tags focadas em ranqueamento orgânico.',
  },
  'youtube-ctr': {
    name: 'YouTube CTR',
    desc: 'Clickbait inteligente — máximo de cliques',
    instruction: 'Foco total em CTR. Títulos com elementos de curiosidade, números, urgência e promessa clara de valor — no limite do clickbait inteligente. Descrições com gancho irresistível nas primeiras linhas. Emojis chamativos. Tudo pensado para fazer o usuário clicar.',
  },
  'shorts': {
    name: 'YouTube Shorts',
    desc: 'Formato curto — viral e direto',
    instruction: 'Otimize para YouTube Shorts. Títulos com no máximo 60 caracteres, diretos e impactantes. Descrição curta e direta. Emojis dinâmicos. Hashtags focadas em viralização e descoberta.',
  },
}
