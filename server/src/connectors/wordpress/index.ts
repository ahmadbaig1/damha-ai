import {
  SupportProvider,
  SiteInfo,
  PluginInfo,
  DiagnosticResult,
  FrontendCheck,
  SSLCheck,
  WpAdminCheck,
  PageCheck,
  ConflictMatch,
} from '../base/SupportProvider'

const WP_ORG_PLUGIN_API = 'https://api.wordpress.org/plugins/info/1.2/'

const KNOWN_CONFLICTS: Array<{ slugs: string[]; description: string; severity: ConflictMatch['severity'] }> = [
  {
    slugs: ['wordpress-seo', 'all-in-one-seo-pack'],
    description: 'Yoast SEO and All in One SEO Pack both manage meta tags and XML sitemaps — running both causes duplicate meta, broken sitemaps, and indexing issues.',
    severity: 'high',
  },
  {
    slugs: ['wp-rocket', 'w3-total-cache'],
    description: 'WP Rocket and W3 Total Cache both handle full-page caching. Two caching plugins active simultaneously causes cache conflicts and broken pages.',
    severity: 'high',
  },
  {
    slugs: ['wp-rocket', 'wp-super-cache'],
    description: 'WP Rocket and WP Super Cache conflict on caching. Only one caching plugin should be active.',
    severity: 'high',
  },
  {
    slugs: ['wp-rocket', 'woocommerce'],
    description: 'WP Rocket requires WooCommerce cart/checkout pages to be excluded from caching, or customers see stale cart data and checkout errors.',
    severity: 'medium',
  },
  {
    slugs: ['elementor', 'js_composer'],
    description: 'Elementor and WPBakery Page Builder (js_composer) both inject conflicting scripts and shortcodes — causes layout corruption and editor failures.',
    severity: 'high',
  },
  {
    slugs: ['elementor', 'divi-builder'],
    description: 'Elementor and Divi Builder are both full page builders — running both causes JavaScript conflicts and broken layouts.',
    severity: 'high',
  },
  {
    slugs: ['wordfence', 'ithemes-security'],
    description: 'Wordfence and iThemes Security (Solid Security) both modify .htaccess and manage firewall rules — running both risks login lockouts and rule conflicts.',
    severity: 'medium',
  },
  {
    slugs: ['autoptimize', 'wp-rocket'],
    description: 'Autoptimize and WP Rocket both minify and combine CSS/JS — running both causes double-minification, broken scripts, and white screens.',
    severity: 'high',
  },
  {
    slugs: ['contact-form-7', 'jetpack'],
    description: 'Contact Form 7 and Jetpack contact form module can conflict when both are active on the same page — forms may submit twice or fail to send.',
    severity: 'low',
  },
  {
    slugs: ['woocommerce', 'wpml'],
    description: 'WooCommerce and WPML require the WooCommerce Multilingual plugin to work together correctly — without it, product pages, checkout, and currency switching break.',
    severity: 'medium',
  },
]

async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Auxly/1.0' },
    })
  } finally {
    clearTimeout(timer)
  }
}

export class WordPressConnector implements SupportProvider {
  name = 'wordpress'
  capabilities = ['checkFrontend', 'checkSSL', 'checkWpAdmin', 'checkSpecificPage', 'checkKnownConflicts', 'getSite', 'getPluginInfo', 'getDiagnostics']

  async authenticate(): Promise<void> {}

  async getSite(url: string): Promise<SiteInfo> {
    const cleanUrl = url.replace(/\/$/, '')
    try {
      const res = await fetchWithTimeout(`${cleanUrl}/wp-json/`)
      if (!res.ok) return { url: cleanUrl, apiAccessible: false }

      const data = (await res.json()) as {
        name?: string
        description?: string
        namespaces?: string[]
      }

      // Try to pull WP version from the RSS feed generator tag
      let wpVersion: string | undefined
      try {
        const feedRes = await fetchWithTimeout(`${cleanUrl}/feed/`, 3000)
        if (feedRes.ok) {
          const feedText = await feedRes.text()
          const match = feedText.match(/wordpress\.org\/\?v=([\d.]+)/)
          if (match) wpVersion = match[1]
        }
      } catch {
        // version detection is best-effort
      }

      return {
        url: cleanUrl,
        name: data.name,
        description: data.description,
        wpVersion,
        apiAccessible: true,
        apiNamespaces: data.namespaces,
      }
    } catch {
      return { url: cleanUrl, apiAccessible: false }
    }
  }

  async getPluginInfo(slug: string): Promise<PluginInfo> {
    const notFound: PluginInfo = {
      slug,
      name: slug,
      version: '',
      lastUpdated: '',
      requiresWP: '',
      requiresPHP: '',
      testedUpTo: '',
      activeInstalls: 0,
      found: false,
    }
    try {
      const url = `${WP_ORG_PLUGIN_API}?action=plugin_information&request[slug]=${encodeURIComponent(slug)}&request[fields][active_installs]=1`
      const res = await fetchWithTimeout(url)
      if (!res.ok) return notFound
      const data = (await res.json()) as {
        name?: string
        version?: string
        last_updated?: string
        requires?: string
        requires_php?: string
        tested?: string
        active_installs?: number
      }
      if (!data.name) return notFound
      return {
        slug,
        name: data.name,
        version: data.version ?? '',
        lastUpdated: data.last_updated ?? '',
        requiresWP: data.requires ?? '',
        requiresPHP: data.requires_php ?? '',
        testedUpTo: data.tested ?? '',
        activeInstalls: data.active_installs ?? 0,
        found: true,
      }
    } catch {
      return notFound
    }
  }

  async getDiagnostics(siteUrl: string): Promise<DiagnosticResult[]> {
    const site = await this.getSite(siteUrl)
    const results: DiagnosticResult[] = []

    results.push({
      type: 'api_access',
      status: site.apiAccessible ? 'pass' : 'warning',
      message: site.apiAccessible
        ? 'WordPress REST API is accessible'
        : 'WordPress REST API is not accessible (may be disabled or blocked)',
    })

    if (site.wpVersion) {
      const [majorStr, minorStr] = site.wpVersion.split('.')
      const major = parseInt(majorStr, 10)
      const minor = parseInt(minorStr ?? '0', 10)
      const isCurrent = major > 6 || (major === 6 && minor >= 4)
      results.push({
        type: 'wp_version',
        status: isCurrent ? 'pass' : 'warning',
        message: `WordPress ${site.wpVersion}${isCurrent ? '' : ' — consider updating to the latest release'}`,
      })
    }

    return results
  }

  async checkFrontend(url: string): Promise<FrontendCheck> {
    const cleanUrl = url.replace(/\/$/, '')
    try {
      const res = await fetchWithTimeout(cleanUrl, 8000)
      const html = await res.text()

      // Strip tags to estimate visible text content
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
      const bodyHtml = bodyMatch ? bodyMatch[1] : html
      const visibleText = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

      const appearsBlank = !res.ok || visibleText.length < 200

      const note = !res.ok
        ? `Site returned HTTP ${res.status} — server error or redirect issue`
        : appearsBlank
          ? `Site returns HTTP 200 but visible body content is very thin (${visibleText.length} chars) — consistent with a white screen`
          : `Site appears to be loading normally (${html.length} chars of HTML, ${visibleText.length} chars of visible text)`

      return {
        url: cleanUrl,
        httpStatus: res.status,
        accessible: res.ok,
        contentLength: html.length,
        visibleTextLength: visibleText.length,
        appearsBlank,
        note,
      }
    } catch (err) {
      return {
        url: cleanUrl,
        httpStatus: null,
        accessible: false,
        contentLength: 0,
        visibleTextLength: 0,
        appearsBlank: true,
        note: `Could not reach site: ${err instanceof Error ? err.message : 'timeout or network error'}`,
      }
    }
  }

  async checkSSL(url: string): Promise<SSLCheck> {
    const domain = url.replace(/^https?:\/\//, '').split('/')[0]
    const httpsUrl = `https://${domain}`
    const httpUrl = `http://${domain}`

    try {
      await fetchWithTimeout(httpsUrl, 8000)

      // HTTPS works — check if HTTP redirects to it
      let redirectsToHTTPS = false
      try {
        const httpRes = await fetchWithTimeout(httpUrl, 5000)
        redirectsToHTTPS = httpRes.url.startsWith('https://')
      } catch {
        redirectsToHTTPS = false
      }

      return {
        url: httpsUrl,
        hasHTTPS: true,
        redirectsToHTTPS,
        sslError: null,
        note: `HTTPS is valid and working.${redirectsToHTTPS ? ' HTTP redirects to HTTPS.' : ' HTTP does not automatically redirect to HTTPS — mixed-content or insecure link issues are possible.'}`,
      }
    } catch (err) {
      const cause = err instanceof Error ? (err as Error & { cause?: unknown }).cause : undefined
      const msg = [
        err instanceof Error ? err.message : '',
        cause ? String(cause) : '',
      ].join(' ').toLowerCase()

      let sslError = 'HTTPS unavailable or SSL error'
      if (msg.includes('cert_has_expired') || msg.includes('expired')) {
        sslError = 'SSL certificate has expired'
      } else if (msg.includes('self_signed') || msg.includes('self-signed')) {
        sslError = 'SSL certificate is self-signed and not trusted by browsers'
      } else if (msg.includes('unable_to_verify') || msg.includes('unable to verify')) {
        sslError = 'SSL certificate chain cannot be verified'
      } else if (msg.includes('hostname') || msg.includes('does not match')) {
        sslError = 'SSL certificate hostname mismatch'
      }

      return {
        url: httpsUrl,
        hasHTTPS: false,
        redirectsToHTTPS: false,
        sslError,
        note: `SSL check failed: ${sslError}`,
      }
    }
  }

  async checkWpAdmin(url: string): Promise<WpAdminCheck> {
    const cleanUrl = url.replace(/\/$/, '')
    const adminUrl = `${cleanUrl}/wp-admin/`
    try {
      const res = await fetchWithTimeout(adminUrl, 8000)
      const html = await res.text()
      const hasLoginForm =
        html.includes('id="loginform"') ||
        html.includes('name="user_login"') ||
        html.includes('wp-login.php')

      return {
        url: adminUrl,
        accessible: res.ok,
        httpStatus: res.status,
        hasLoginForm,
        note: !res.ok
          ? `wp-admin returned HTTP ${res.status} — may indicate a server-side error affecting the backend`
          : hasLoginForm
            ? 'wp-admin is accessible and shows the login page — WordPress backend is functional'
            : `wp-admin returned HTTP ${res.status} but no login form detected — may be blank or redirecting unexpectedly`,
      }
    } catch (err) {
      return {
        url: adminUrl,
        accessible: false,
        httpStatus: null,
        hasLoginForm: false,
        note: `Could not reach wp-admin: ${err instanceof Error ? err.message : 'timeout or network error'}`,
      }
    }
  }

  async checkSpecificPage(siteUrl: string): Promise<PageCheck> {
    const cleanUrl = siteUrl.replace(/\/$/, '')

    // Try to get a real post URL from the REST API
    let pageUrl: string | null = null
    try {
      const res = await fetchWithTimeout(
        `${cleanUrl}/wp-json/wp/v2/posts?per_page=1&_fields=link`,
        5000,
      )
      if (res.ok) {
        const posts = (await res.json()) as Array<{ link?: string }>
        pageUrl = posts[0]?.link ?? null
      }
    } catch {
      // fall through to fallback
    }

    if (!pageUrl) pageUrl = `${cleanUrl}/?p=1`

    try {
      const res = await fetchWithTimeout(pageUrl, 8000)
      const html = await res.text()
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
      const bodyHtml = bodyMatch ? bodyMatch[1] : html
      const visibleText = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const appearsBlank = !res.ok || visibleText.length < 200

      return {
        pageUrl,
        httpStatus: res.status,
        accessible: res.ok,
        appearsBlank,
        visibleTextLength: visibleText.length,
        note: appearsBlank
          ? `Specific page (${pageUrl}) appears blank or errored (HTTP ${res.status}, ${visibleText.length} chars of text) — issue may be page-specific`
          : `Specific page (${pageUrl}) loads normally (${visibleText.length} chars of text) — issue is not universal across all pages`,
      }
    } catch (err) {
      return {
        pageUrl,
        httpStatus: null,
        accessible: false,
        appearsBlank: true,
        visibleTextLength: 0,
        note: `Could not reach page: ${err instanceof Error ? err.message : 'timeout or network error'}`,
      }
    }
  }

  checkKnownConflicts(slugs: string[]): ConflictMatch[] {
    const slugSet = new Set(slugs)
    return KNOWN_CONFLICTS.filter((c) => c.slugs.every((s) => slugSet.has(s))).map((c) => ({
      plugins: c.slugs,
      description: c.description,
      severity: c.severity,
    }))
  }

  async runDiagnostic(type: string, _params: object): Promise<DiagnosticResult> {
    return { type, status: 'unknown', message: 'Diagnostic not implemented' }
  }

  async searchKnowledge(_query: string): Promise<object[]> {
    return []
  }
}

export const wordpressConnector = new WordPressConnector()
