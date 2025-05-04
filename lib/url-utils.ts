/**
 * Utility functions for handling URLs in the application
 */

/**
 * Returns the site URL - always massclip.pro for production
 */
export function getSiteUrl(): string {
  // Always return massclip.pro for production
  return "https://massclip.pro"
}

/**
 * Returns the production URL (same as getSiteUrl)
 */
export function getProductionUrl(): string {
  return getSiteUrl()
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
 * Gets the current domain from the browser
 */
export function getCurrentDomain(): string {
  // Even if we're on a different domain, always return massclip.pro
  return getSiteUrl()
}
