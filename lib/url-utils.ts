/**
 * Utility functions for handling URLs in the application
 */

/**
 * Returns the primary site URL based on environment variables
 */
export function getSiteUrl(): string {
  // Use the environment variable for the site URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (!siteUrl) {
    console.warn("WARNING: NEXT_PUBLIC_SITE_URL is not set. Using localhost as fallback.")
    return "http://localhost:3000"
  }

  return siteUrl
}

/**
 * Returns the secondary site URL based on environment variables
 */
export function getSecondarySiteUrl(): string | null {
  // Use the environment variable for the secondary site URL
  const secondarySiteUrl = process.env.NEXT_PUBLIC_SITE_URL_2

  if (!secondarySiteUrl) {
    return null
  }

  return secondarySiteUrl
}

/**
 * Returns the production URL (same as primary site URL for consistency)
 */
export function getProductionUrl(): string {
  return getSiteUrl()
}

/**
 * Returns all configured site URLs as an array
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
 * Creates a URL with the production domain
 * @param path The path to append to the production domain
 */
export function createProductionUrl(path: string): string {
  const baseUrl = getProductionUrl()
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}

/**
 * Checks if the current URL is the production URL
 * @param url The URL to check
 */
export function isProductionUrl(url: string): boolean {
  const productionUrl = getProductionUrl()
  // Extract domain without protocol for comparison
  const productionDomain = productionUrl.replace(/^https?:\/\//, "")
  return url.includes(productionDomain)
}

/**
 * Checks if a URL belongs to any of our domains
 * @param url The URL to check
 */
export function isOurDomain(url: string): boolean {
  const allUrls = getAllSiteUrls()

  for (const siteUrl of allUrls) {
    const domain = siteUrl.replace(/^https?:\/\//, "")
    if (url.includes(domain)) {
      return true
    }
  }

  return false
}

/**
 * Gets the current domain from the URL or returns the primary site URL
 * @param url Optional URL to extract domain from
 */
export function getCurrentDomain(url?: string): string {
  // If we're in the browser and no URL is provided, use the current location
  if (typeof window !== "undefined" && !url) {
    url = window.location.href
  }

  // If we have a URL, check if it matches any of our domains
  if (url) {
    const allUrls = getAllSiteUrls()

    for (const siteUrl of allUrls) {
      const domain = siteUrl.replace(/^https?:\/\//, "")
      if (url.includes(domain)) {
        return siteUrl
      }
    }
  }

  // Default to the primary site URL
  return getSiteUrl()
}
