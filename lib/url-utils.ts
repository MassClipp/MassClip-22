/**
 * Gets the site URL from environment variables
 */
export function getSiteUrl(): string {
  // Use NEXT_PUBLIC_SITE_URL if available
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }

  // Fallback for development
  return "http://localhost:3000"
}

/**
 * Gets the secondary site URL from environment variables
 */
export function getSecondarySiteUrl(): string | null {
  return process.env.NEXT_PUBLIC_SITE_URL_2 || null
}

/**
 * Gets all configured site URLs
 */
export function getAllSiteUrls(): string[] {
  const urls = [getSiteUrl()]
  const secondaryUrl = getSecondarySiteUrl()

  if (secondaryUrl) {
    urls.push(secondaryUrl)
  }

  return urls
}

/**
 * Gets the production URL (same as getSiteUrl for consistency)
 */
export function getProductionUrl(): string {
  return getSiteUrl()
}

/**
 * Extracts the domain from a URL
 */
function extractDomain(url: string): string {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.hostname
  } catch (e) {
    return url
  }
}

/**
 * Checks if a URL is our production URL
 */
export function isProductionUrl(url: string): boolean {
  const productionDomain = extractDomain(getSiteUrl())
  const urlDomain = extractDomain(url)

  return productionDomain === urlDomain
}

/**
 * Checks if a URL belongs to any of our domains
 */
export function isOurDomain(url: string): boolean {
  const urlDomain = extractDomain(url)
  const ourDomains = getAllSiteUrls().map(extractDomain)

  return ourDomains.includes(urlDomain)
}

/**
 * Gets the current domain from the browser
 */
export function getCurrentDomain(): string {
  if (typeof window !== "undefined") {
    return window.location.origin
  }

  return getSiteUrl()
}
