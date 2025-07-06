import Stripe from "stripe"

interface StripeClientConfig {
  client: Stripe
  mode: "test" | "live"
  keyType: string
}

/**
 * Detects whether a session ID is test or live and returns the appropriate Stripe client
 */
export function getStripeClientForSession(sessionId: string): StripeClientConfig {
  const isTestSession = sessionId.startsWith("cs_test_")
  const isLiveSession = sessionId.startsWith("cs_live_")

  if (!isTestSession && !isLiveSession) {
    throw new Error(`Invalid session ID format: ${sessionId.substring(0, 20)}...`)
  }

  const mode = isTestSession ? "test" : "live"
  const keyEnvVar = isTestSession ? "STRIPE_SECRET_KEY_TEST" : "STRIPE_SECRET_KEY_LIVE"
  const stripeKey = isTestSession ? process.env.STRIPE_SECRET_KEY_TEST : process.env.STRIPE_SECRET_KEY_LIVE

  if (!stripeKey) {
    // Fallback to main key if specific key not available
    const fallbackKey = process.env.STRIPE_SECRET_KEY
    if (!fallbackKey) {
      throw new Error(`Missing Stripe key: ${keyEnvVar} not found (and no STRIPE_SECRET_KEY fallback)`)
    }

    console.warn(`⚠️ [Stripe] ${keyEnvVar} not found, using STRIPE_SECRET_KEY as fallback`)

    // Validate that fallback key matches session type
    const fallbackIsTest = fallbackKey.startsWith("sk_test_")
    const fallbackIsLive = fallbackKey.startsWith("sk_live_")

    if (isTestSession && !fallbackIsTest) {
      throw new Error("Configuration Error: Test session requires test Stripe key, but live key provided")
    }
    if (isLiveSession && !fallbackIsLive) {
      throw new Error("Configuration Error: Live session requires live Stripe key, but test key provided")
    }

    return {
      client: new Stripe(fallbackKey, { apiVersion: "2024-06-20" }),
      mode,
      keyType: `STRIPE_SECRET_KEY (fallback for ${keyEnvVar})`,
    }
  }

  // Validate key format matches session type
  const keyIsTest = stripeKey.startsWith("sk_test_")
  const keyIsLive = stripeKey.startsWith("sk_live_")

  if (isTestSession && !keyIsTest) {
    throw new Error(
      `Configuration Error: Test session (${sessionId.substring(0, 20)}...) requires test key, but live key provided in ${keyEnvVar}`,
    )
  }
  if (isLiveSession && !keyIsLive) {
    throw new Error(
      `Configuration Error: Live session (${sessionId.substring(0, 20)}...) requires live key, but test key provided in ${keyEnvVar}`,
    )
  }

  console.log(`✅ [Stripe] Using ${mode} client with ${keyEnvVar}`)

  return {
    client: new Stripe(stripeKey, { apiVersion: "2024-06-20" }),
    mode,
    keyType: keyEnvVar,
  }
}

/**
 * Environment-aware Stripe client getter
 * Automatically selects appropriate keys based on deployment environment
 */
export function getEnvironmentStripeClient(): Stripe {
  const vercelEnv = process.env.VERCEL_ENV || process.env.NODE_ENV || "development"
  const isProduction = vercelEnv === "production"

  let stripeKey: string | undefined
  let keySource: string

  if (isProduction) {
    // Production: prioritize live key
    stripeKey = process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY
    keySource = process.env.STRIPE_SECRET_KEY_LIVE ? "STRIPE_SECRET_KEY_LIVE" : "STRIPE_SECRET_KEY (fallback)"
  } else {
    // Development/Preview: prioritize test key
    stripeKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
    keySource = process.env.STRIPE_SECRET_KEY_TEST ? "STRIPE_SECRET_KEY_TEST" : "STRIPE_SECRET_KEY (fallback)"
  }

  if (!stripeKey) {
    throw new Error(`No Stripe key available for ${vercelEnv} environment`)
  }

  const keyType = stripeKey.startsWith("sk_live_") ? "live" : "test"
  console.log(`🔑 [Stripe] Environment client: ${keySource} (${keyType}) for ${vercelEnv}`)

  return new Stripe(stripeKey, { apiVersion: "2024-06-20" })
}

/**
 * Legacy support - maintains backward compatibility
 */
export const stripe = getEnvironmentStripeClient()
export default stripe
