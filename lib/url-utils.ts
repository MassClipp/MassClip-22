/**
 * Utility functions for handling URLs in the application
 */

/**
 * Returns the production URL based on environment variables
 * This ensures all user-facing redirects go to the correct domain
 */
export function getProductionUrl(): string {
  // Use environment variable instead of hardcoded value
  return process.env.NEXT_PUBLIC_SITE_URL || "https://massclip.pro"
}

/**
 * Returns the site URL based on environment
 */
export function getSiteUrl(): string {
  // Use the environment variable for the site URL
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
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
  return url.includes(productionUrl.replace("https://", ""))
}
