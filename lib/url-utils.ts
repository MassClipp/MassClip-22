/**
 * Utility functions for handling URLs in the application
 */

/**
 * Returns the site URL based on environment variables
 */
export function getSiteUrl(): string {
  // Use the environment variable for the site URL, with massclip.pro as fallback
  return process.env.NEXT_PUBLIC_SITE_URL || "https://massclip.pro"
}

/**
 * Returns the production URL (same as getSiteUrl for consistency)
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
  if (typeof window !== "undefined") {
    return window.location.origin
  }

  return getSiteUrl()
}
