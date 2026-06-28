export interface SiteInfo {
  url: string
  name?: string
  description?: string
  wpVersion?: string
  apiAccessible: boolean
  apiNamespaces?: string[]
}

export interface PluginInfo {
  slug: string
  name: string
  version: string
  lastUpdated: string
  requiresWP: string
  requiresPHP: string
  testedUpTo: string
  activeInstalls: number
  found: boolean
}

export interface FrontendCheck {
  url: string
  httpStatus: number | null
  accessible: boolean
  contentLength: number
  visibleTextLength: number
  appearsBlank: boolean
  note: string
}

export interface SSLCheck {
  url: string
  hasHTTPS: boolean
  redirectsToHTTPS: boolean
  sslError: string | null
  note: string
}

export interface WpAdminCheck {
  url: string
  accessible: boolean
  httpStatus: number | null
  hasLoginForm: boolean
  note: string
}

export interface PageCheck {
  pageUrl: string | null
  httpStatus: number | null
  accessible: boolean
  appearsBlank: boolean
  visibleTextLength: number
  note: string
}

export interface ConflictMatch {
  plugins: string[]
  description: string
  severity: 'low' | 'medium' | 'high'
}

export interface DiagnosticResult {
  type: string
  status: 'pass' | 'warning' | 'fail' | 'unknown'
  message: string
}

export interface SupportProvider {
  name: string
  capabilities: string[]
  authenticate(): Promise<void>
  getSite(url: string): Promise<SiteInfo>
  getPluginInfo(slug: string): Promise<PluginInfo>
  getDiagnostics(siteUrl: string): Promise<DiagnosticResult[]>
  runDiagnostic(type: string, params: object): Promise<DiagnosticResult>
  searchKnowledge(query: string): Promise<object[]>
}
