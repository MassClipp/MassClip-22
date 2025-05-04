/**
 * Utility functions for handling URLs in the application
 */

/**
 * Returns the production URL based on environment variables
 * This ensures all user-facing redirects go to the correct domain
 */
export function getProductionUrl(): string {
  // ONLY use environment variable, no hardcoded fallback domain
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (!siteUrl) {
    console.warn("WARNING: NEXT_PUBLIC_SITE_URL is not set. Using localhost as fallback.")
    return "http://localhost:3000"
  }

  return siteUrl
}

/**
 * Returns the site URL based on environment
 */
export function getSiteUrl(): string {
  // ONLY use environment variable, no hardcoded fallback domain
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (!siteUrl) {
    console.warn("WARNING: NEXT_PUBLIC_SITE_URL is not set. Using localhost as fallback.")
    return "http://localhost:3000"
  }

  return siteUrl
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
