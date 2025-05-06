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
 * Safely handles server-side rendering
 */
export function getCurrentDomain(): string {
  // Even if we're in a browser environment, always return massclip.pro for consistency
  return getSiteUrl()
}

/**
 * Returns the success URL for Stripe checkout
 */
export function getSuccessUrl(): string {
  return `${getSiteUrl()}/subscription/success`
}

/**
 * Returns the cancel URL for Stripe checkout
 */
export function getCancelUrl(): string {
  return `${getSiteUrl()}/subscription/cancel`
}
