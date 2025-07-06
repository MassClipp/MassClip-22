import Stripe from "stripe"

interface StripeConfig {
  client: Stripe
  mode: "test" | "live"
  keyPrefix: string
}

/**
 * Detects session type from session ID and returns appropriate Stripe client
 */
export function getStripeClientForSession(sessionId: string): StripeConfig {
  if (!sessionId) {
    throw new Error("Session ID is required")
  }

  const isTestSession = sessionId.startsWith("cs_test_")
  const isLiveSession = sessionId.startsWith("cs_live_")

  if (!isTestSession && !isLiveSession) {
    throw new Error(`Invalid session ID format: ${sessionId.substring(0, 20)}...`)
  }

  if (isTestSession) {
    return getTestStripeClient()
  } else {
    return getLiveStripeClient()
  }
}

/**
 * Returns test Stripe client
 */
function getTestStripeClient(): StripeConfig {
  const testKey = process.env.STRIPE_SECRET_KEY_TEST

  if (!testKey) {
    throw new Error("STRIPE_SECRET_KEY_TEST environment variable is not set")
  }

  if (!testKey.startsWith("sk_test_")) {
    throw new Error(`Invalid test key format: ${testKey.substring(0, 8)}...`)
  }

  return {
    client: new Stripe(testKey, { apiVersion: "2024-06-20" }),
    mode: "test",
    keyPrefix: testKey.substring(0, 8),
  }
}

/**
 * Returns live Stripe client
 */
function getLiveStripeClient(): StripeConfig {
  const liveKey = process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY

  if (!liveKey) {
    throw new Error("STRIPE_SECRET_KEY_LIVE or STRIPE_SECRET_KEY environment variable is not set")
  }

  if (!liveKey.startsWith("sk_live_")) {
    throw new Error(`Invalid live key format: ${liveKey.substring(0, 8)}...`)
  }

  return {
    client: new Stripe(liveKey, { apiVersion: "2024-06-20" }),
    mode: "live",
    keyPrefix: liveKey.substring(0, 8),
  }
}

/**
 * Environment-aware Stripe client (for general use)
 */
export function getEnvironmentStripeClient(): StripeConfig {
  const vercelEnv = process.env.VERCEL_ENV || "development"
  const isProduction = vercelEnv === "production"

  console.log(`🔧 [Stripe] Environment: ${vercelEnv}, Production: ${isProduction}`)

  if (isProduction) {
    return getLiveStripeClient()
  } else {
    // For development/preview, prefer test keys
    try {
      return getTestStripeClient()
    } catch (error) {
      console.warn("⚠️ [Stripe] Test key not available, falling back to live key")
      return getLiveStripeClient()
    }
  }
}

/**
 * Validates session ID and key compatibility
 */
export function validateSessionKeyCompatibility(sessionId: string, stripeConfig: StripeConfig): boolean {
  const isTestSession = sessionId.startsWith("cs_test_")
  const isLiveSession = sessionId.startsWith("cs_live_")

  if (isTestSession && stripeConfig.mode === "test") return true
  if (isLiveSession && stripeConfig.mode === "live") return true

  return false
}

/**
 * Debug information for troubleshooting
 */
export function getStripeDebugInfo(sessionId?: string) {
  const vercelEnv = process.env.VERCEL_ENV || "development"
  const hasTestKey = !!process.env.STRIPE_SECRET_KEY_TEST
  const hasLiveKey = !!(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY)

  const debugInfo = {
    environment: vercelEnv,
    isProduction: vercelEnv === "production",
    hasTestKey,
    hasLiveKey,
    testKeyPrefix: hasTestKey ? process.env.STRIPE_SECRET_KEY_TEST?.substring(0, 8) : null,
    liveKeyPrefix: hasLiveKey
      ? (process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY)?.substring(0, 8)
      : null,
  }

  if (sessionId) {
    debugInfo.sessionId = sessionId.substring(0, 20) + "..."
    debugInfo.sessionType = sessionId.startsWith("cs_test_")
      ? "test"
      : sessionId.startsWith("cs_live_")
        ? "live"
        : "unknown"
    debugInfo.expectedKeyType = debugInfo.sessionType === "test" ? "sk_test_" : "sk_live_"
  }

  return debugInfo
}
