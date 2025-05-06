/**
 * Utility to check and validate Stripe environment variables
 */

import { getProductionUrl } from "./url-utils"

export function checkStripeEnvVars(): {
  valid: boolean
  missing: string[]
  invalid: string[]
  messages: Record<string, string>
} {
  const requiredVars = ["STRIPE_SECRET_KEY", "STRIPE_PRICE_ID", "NEXT_PUBLIC_SITE_URL"]
  const patterns = {
    STRIPE_SECRET_KEY: /^sk_(test|live)_[a-zA-Z0-9]+$/,
    STRIPE_PRICE_ID: /^price_[a-zA-Z0-9]+$/,
    NEXT_PUBLIC_SITE_URL: /^https?:\/\/.+/,
  }

  const missing: string[] = []
  const invalid: string[] = []
  const messages: Record<string, string> = {}

  // Check for missing variables
  requiredVars.forEach((varName) => {
    const value = process.env[varName]
    if (!value || value.trim() === "") {
      missing.push(varName)
      messages[varName] = "Missing or empty"
    } else if (patterns[varName as keyof typeof patterns] && !patterns[varName as keyof typeof patterns].test(value)) {
      invalid.push(varName)
      messages[varName] = "Invalid format"
    } else {
      messages[varName] = "Valid"
    }
  })

  // Special check for production URL
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_SITE_URL &&
    !process.env.NEXT_PUBLIC_SITE_URL.includes("massclip.pro")
  ) {
    invalid.push("NEXT_PUBLIC_SITE_URL")
    messages["NEXT_PUBLIC_SITE_URL"] = "Not using production URL in production environment"
  }

  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    messages,
  }
}

/**
 * Get instructions for setting up Stripe environment variables
 */
export function getStripeEnvInstructions(varName: string): string {
  switch (varName) {
    case "STRIPE_SECRET_KEY":
      return "Get this from your Stripe Dashboard > Developers > API keys. Format: sk_test_... or sk_live_..."
    case "STRIPE_PRICE_ID":
      return "Get this from Stripe Dashboard > Products > Your Product > API ID. Format: price_..."
    case "NEXT_PUBLIC_SITE_URL":
      return `Set to your site URL (${getProductionUrl()} for production)`
    default:
      return "Check your Stripe dashboard for this value"
  }
}

/**
 * Component to display in development to check environment variables
 */
export function getEnvSetupInstructions(): string {
  const { valid, missing, invalid } = checkStripeEnvVars()

  if (valid) {
    return "All Stripe environment variables are correctly set!"
  }

  let instructions = "Please set up the following environment variables in your .env.local file:\n\n"
  ;[...missing, ...invalid].forEach((varName) => {
    instructions += `${varName}: ${getStripeEnvInstructions(varName)}\n`
  })

  return instructions
}
