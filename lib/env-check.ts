/**
 * Utility to check if required environment variables are defined
 */
export function checkRequiredEnvVars() {
  const requiredVars = ["STRIPE_SECRET_KEY", "STRIPE_PRICE_ID", "NEXT_PUBLIC_SITE_URL"]

  const missingVars = requiredVars.filter((varName) => {
    const value = process.env[varName]
    return !value || value.trim() === ""
  })

  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(", ")}`)
    return false
  }

  return true
}

/**
 * Utility to check if client-side environment variables are defined
 */
export function checkClientEnvVars() {
  const requiredVars = ["NEXT_PUBLIC_SITE_URL"]

  const missingVars = requiredVars.filter((varName) => {
    const value = process.env[varName]
    return !value || value.trim() === ""
  })

  if (missingVars.length > 0) {
    console.error(`Missing required client environment variables: ${missingVars.join(", ")}`)
    return false
  }

  return true
}
