import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ---- Tailwind class merging ----
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ---- Formatting ----
export function formatDate(date: string | Date, pattern = 'dd/MM/yyyy HH:mm') {
  return format(new Date(date), pattern, { locale: ptBR })
}

export function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatCurrency(value: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value / 100) // Meta uses cents
}

// ---- String helpers ----
export function truncate(str: string, length: number) {
  return str.length > length ? str.slice(0, length) + '…' : str
}

export function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// ---- Status helpers ----
export type StatusColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple'

export function getStatusColor(status: string): StatusColor {
  const map: Record<string, StatusColor> = {
    ACTIVE: 'green',
    DRAFT: 'gray',
    SUBMITTED: 'blue',
    PAUSED: 'yellow',
    ERROR: 'red',
    DELETED: 'red',
    ARCHIVED: 'gray',
  }
  return map[status] ?? 'gray'
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'Ativo',
    DRAFT: 'Rascunho',
    SUBMITTED: 'Enviado',
    PAUSED: 'Pausado',
    ERROR: 'Erro',
    DELETED: 'Excluído',
    ARCHIVED: 'Arquivado',
  }
  return map[status] ?? status
}

// ---- Meta helpers ----
export function getObjectiveLabel(objective: string): string {
  const map: Record<string, string> = {
    OUTCOME_AWARENESS: 'Reconhecimento',
    OUTCOME_TRAFFIC: 'Tráfego',
    OUTCOME_ENGAGEMENT: 'Engajamento',
    OUTCOME_LEADS: 'Captação de leads',
    OUTCOME_APP_PROMOTION: 'Promoção de app',
    OUTCOME_SALES: 'Vendas',
  }
  return map[objective] ?? objective
}

export function getOptimizationLabel(goal: string): string {
  const map: Record<string, string> = {
    LINK_CLICKS: 'Cliques no link',
    REACH: 'Alcance',
    IMPRESSIONS: 'Impressões',
    CONVERSIONS: 'Conversões',
    LEAD_GENERATION: 'Geração de leads',
    APP_INSTALLS: 'Instalações de app',
    VIDEO_VIEWS: 'Visualizações de vídeo',
    LANDING_PAGE_VIEWS: 'Visualizações da landing page',
    OFFSITE_CONVERSIONS: 'Conversões fora do site',
  }
  return map[goal] ?? goal
}

export function getCtaLabel(cta: string): string {
  const map: Record<string, string> = {
    LEARN_MORE: 'Saiba mais',
    SHOP_NOW: 'Compre agora',
    SIGN_UP: 'Cadastre-se',
    DOWNLOAD: 'Baixar',
    CONTACT_US: 'Entre em contato',
    APPLY_NOW: 'Inscreva-se',
    GET_QUOTE: 'Obter orçamento',
    SUBSCRIBE: 'Assinar',
    ORDER_NOW: 'Peça agora',
    GET_OFFER: 'Ver oferta',
    INSTALL_APP: 'Instalar app',
    OPEN_LINK: 'Abrir link',
    NO_BUTTON: 'Sem botão',
  }
  return map[cta] ?? cta
}

// ---- JSON helpers ----
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T
  } catch {
    return fallback
  }
}

export function prettyJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2)
}

// ---- URL helpers ----
export function buildMetaUrl(path: string, version = 'v21.0') {
  return `https://graph.facebook.com/${version}/${path.replace(/^\//, '')}`
}
