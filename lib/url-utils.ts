/**
 * Utility functions for handling URLs in the application
 */

/**
 * Returns the production URL regardless of environment
 * This ensures all user-facing redirects go to the production domain
 */
export function getProductionUrl(): string {
  return "https://massclip.pro"
}

/**
 * Returns the site URL based on environment
 * In production, this will always return the production URL
 * In development or preview, it will use the environment variable or fallback
 */
export function getSiteUrl(): string {
  // Check if we're in production (Vercel sets this automatically)
  const isProduction = process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_VERCEL_ENV?.includes("preview")

  if (isProduction) {
    return getProductionUrl()
  }

  // For development or preview environments, use the environment variable or fallback
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
  return url.includes("massclip.pro")
}
