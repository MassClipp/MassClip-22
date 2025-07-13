/**
 * Utility functions for handling URLs in the application
 */

/**
 * Returns the appropriate site URL based on environment
 */
export function getSiteUrl(): string {
  // Always use hardcoded preview URL for preview environment
  if (process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV !== "production") {
    return "https://v0-massclip1-git-preview-massclippp-gmailcoms-projects.vercel.app"
  }

  // Production URL
  return "https://massclip.pro"
}

/**
 * Returns the production URL (always massclip.pro)
 */
export function getProductionUrl(): string {
  return "https://massclip.pro"
}

/**
 * Returns the current environment's base URL
 */
export function getCurrentEnvironmentUrl(): string {
  return getSiteUrl()
}

/**
 * Creates a URL with the current environment's domain
 * @param path The path to append to the domain
 */
export function createEnvironmentUrl(path: string): string {
  const baseUrl = getSiteUrl()
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
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
  return getSiteUrl()
}

/**
 * Returns the success URL for Stripe checkout (environment-aware)
 */
export function getSuccessUrl(): string {
  return `${getSiteUrl()}/subscription/success`
}

/**
 * Returns the cancel URL for Stripe checkout (environment-aware)
 */
export function getCancelUrl(): string {
  return `${getSiteUrl()}/subscription/cancel`
}

/**
 * Returns the webhook URL for the current environment
 */
export function getWebhookUrl(): string {
  return `${getSiteUrl()}/api/stripe/webhook`
}

/**
 * Checks if we're in a preview environment
 */
export function isPreviewEnvironment(): boolean {
  return process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV !== "production"
}

/**
 * Checks if we're in production
 */
export function isProductionEnvironment(): boolean {
  return process.env.VERCEL_ENV === "production"
}

/**
 * Debug function to log current environment info
 */
export function logEnvironmentInfo(): void {
  console.log("🌐 Environment Info:", {
    VERCEL_ENV: process.env.VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
    calculatedSiteUrl: getSiteUrl(),
    isPreview: isPreviewEnvironment(),
    isProduction: isProductionEnvironment(),
    hardcodedPreviewUrl: "https://v0-massclip1-git-preview-massclippp-gmailcoms-projects.vercel.app",
  })
}
