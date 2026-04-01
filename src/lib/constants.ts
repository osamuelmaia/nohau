// ============================================================
// Application Constants
// ============================================================

export const APP_NAME = 'Zima Ads Manager'
export const APP_VERSION = '1.0.0'

// ---- Meta API ----
export const META_API_VERSION = 'v21.0'
export const META_BASE_URL = 'https://graph.facebook.com'

// ---- Campaign Objectives ----
export const CAMPAIGN_OBJECTIVES = [
  { value: 'OUTCOME_AWARENESS', label: 'Reconhecimento de marca' },
  { value: 'OUTCOME_TRAFFIC', label: 'Tráfego' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engajamento' },
  { value: 'OUTCOME_LEADS', label: 'Captação de leads' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'Promoção de app' },
  { value: 'OUTCOME_SALES', label: 'Vendas / Conversões' },
]

export const SPECIAL_AD_CATEGORIES = [
  { value: 'NONE', label: 'Nenhuma' },
  { value: 'EMPLOYMENT', label: 'Emprego' },
  { value: 'HOUSING', label: 'Moradia' },
  { value: 'CREDIT', label: 'Crédito' },
  { value: 'ISSUES_ELECTIONS_POLITICS', label: 'Questões sociais, eleições ou política' },
]

// ---- Budget ----
export const BUDGET_TYPES = [
  { value: 'DAILY', label: 'Orçamento diário' },
  { value: 'LIFETIME', label: 'Orçamento total' },
]

// ---- Optimization Goals ----
export const OPTIMIZATION_GOALS = [
  { value: 'LINK_CLICKS', label: 'Cliques no link' },
  { value: 'REACH', label: 'Alcance' },
  { value: 'IMPRESSIONS', label: 'Impressões' },
  { value: 'CONVERSIONS', label: 'Conversões' },
  { value: 'LEAD_GENERATION', label: 'Geração de leads' },
  { value: 'APP_INSTALLS', label: 'Instalações de app' },
  { value: 'VIDEO_VIEWS', label: 'Visualizações de vídeo' },
  { value: 'LANDING_PAGE_VIEWS', label: 'Visualizações da landing page' },
  { value: 'OFFSITE_CONVERSIONS', label: 'Conversões offsite' },
]

// ---- Billing Events ----
export const BILLING_EVENTS = [
  { value: 'IMPRESSIONS', label: 'Impressões' },
  { value: 'LINK_CLICKS', label: 'Cliques no link' },
  { value: 'APP_INSTALLS', label: 'Instalações' },
  { value: 'VIDEO_VIEWS', label: 'Visualizações de vídeo' },
]

// ---- Bid Strategies ----
export const BID_STRATEGIES = [
  { value: 'LOWEST_COST_WITHOUT_CAP', label: 'Menor custo (sem limite)' },
  { value: 'LOWEST_COST_WITH_BID_CAP', label: 'Menor custo com limite de lance' },
  { value: 'COST_CAP', label: 'Limite de custo' },
]

// ---- Placements ----
export const PUBLISHER_PLATFORMS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'messenger', label: 'Messenger' },
  { value: 'audience_network', label: 'Audience Network' },
]

export const FACEBOOK_POSITIONS = [
  { value: 'feed', label: 'Feed' },
  { value: 'right_hand_column', label: 'Coluna direita' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'video_feeds', label: 'Video Feeds' },
  { value: 'story', label: 'Stories' },
  { value: 'reels', label: 'Reels' },
  { value: 'search', label: 'Resultados de pesquisa' },
  { value: 'instream_video', label: 'Vídeos in-stream' },
]

export const INSTAGRAM_POSITIONS = [
  { value: 'stream', label: 'Feed' },
  { value: 'story', label: 'Stories' },
  { value: 'reels', label: 'Reels' },
  { value: 'explore', label: 'Explorar' },
  { value: 'explore_home', label: 'Início do Explorar' },
  { value: 'profile_feed', label: 'Feed do perfil' },
  { value: 'ig_search', label: 'Pesquisa do Instagram' },
  { value: 'reels_overlay_ads', label: 'Overlay de Reels' },
]

// ---- CTAs ----
export const CALL_TO_ACTIONS = [
  { value: 'LEARN_MORE', label: 'Saiba mais' },
  { value: 'SHOP_NOW', label: 'Compre agora' },
  { value: 'SIGN_UP', label: 'Cadastre-se' },
  { value: 'DOWNLOAD', label: 'Baixar' },
  { value: 'CONTACT_US', label: 'Entre em contato' },
  { value: 'APPLY_NOW', label: 'Inscreva-se agora' },
  { value: 'GET_QUOTE', label: 'Obter orçamento' },
  { value: 'SUBSCRIBE', label: 'Assinar' },
  { value: 'ORDER_NOW', label: 'Peça agora' },
  { value: 'GET_OFFER', label: 'Ver oferta' },
  { value: 'INSTALL_APP', label: 'Instalar app' },
  { value: 'OPEN_LINK', label: 'Abrir link' },
  { value: 'NO_BUTTON', label: 'Sem botão' },
]

// ---- Destination Types ----
export const DESTINATION_TYPES = [
  { value: 'WEBSITE', label: 'Site' },
  { value: 'APP', label: 'Aplicativo' },
  { value: 'MESSENGER', label: 'Messenger' },
  { value: 'INSTAGRAM_PROFILE', label: 'Perfil do Instagram' },
]

// ---- Copy Types ----
export const COPY_TYPES = [
  { value: 'BODY', label: 'Texto principal' },
  { value: 'TITLE', label: 'Título' },
  { value: 'DESCRIPTION', label: 'Descrição' },
]

// ---- Status Options ----
export const CAMPAIGN_STATUSES = [
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'PAUSED', label: 'Pausado' },
]

// ---- Countries (top) ----
export const TOP_COUNTRIES = [
  { value: 'BR', label: 'Brasil' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'PT', label: 'Portugal' },
  { value: 'AR', label: 'Argentina' },
  { value: 'MX', label: 'México' },
  { value: 'CO', label: 'Colômbia' },
  { value: 'CL', label: 'Chile' },
  { value: 'PE', label: 'Peru' },
  { value: 'GB', label: 'Reino Unido' },
  { value: 'DE', label: 'Alemanha' },
  { value: 'FR', label: 'França' },
  { value: 'ES', label: 'Espanha' },
  { value: 'IT', label: 'Itália' },
  { value: 'CA', label: 'Canadá' },
  { value: 'AU', label: 'Austrália' },
]

// ---- File Types ----
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime']
export const MAX_IMAGE_SIZE_MB = 30
export const MAX_VIDEO_SIZE_MB = 4000
