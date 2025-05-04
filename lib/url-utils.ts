/**
 * Returns the site URL based on the current environment
 */
export function getSiteUrl(): string {
  // Always return massclip.pro for production
  return "https://massclip.pro"
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
