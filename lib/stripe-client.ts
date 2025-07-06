import Stripe from "stripe"

interface StripeClientConfig {
  client: Stripe
  mode: "test" | "live"
  keyType: string
}

/**
 * Detects whether a session ID is test or live and returns the appropriate Stripe client
 * Only uses STRIPE_SECRET_KEY and STRIPE_SECRET_KEY_TEST
 */
export function getStripeClientForSession(sessionId: string): StripeClientConfig {
  const isTestSession = sessionId.startsWith("cs_test_")
  const isLiveSession = sessionId.startsWith("cs_live_")

  if (!isTestSession && !isLiveSession) {
    throw new Error(`Invalid session ID format: ${sessionId.substring(0, 20)}...`)
  }

  const mode = isTestSession ? "test" : "live"

  if (isTestSession) {
    // For test sessions, use STRIPE_SECRET_KEY_TEST or fallback to STRIPE_SECRET_KEY if it's a test key
    const testKey = process.env.STRIPE_SECRET_KEY_TEST
    if (testKey) {
      if (!testKey.startsWith("sk_test_")) {
        throw new Error("STRIPE_SECRET_KEY_TEST must be a test key (sk_test_...)")
      }
      console.log("✅ [Stripe] Using STRIPE_SECRET_KEY_TEST for test session")
      return {
        client: new Stripe(testKey, { apiVersion: "2024-06-20" }),
        mode: "test",
        keyType: "STRIPE_SECRET_KEY_TEST",
      }
    }

    // Fallback to main key if it's a test key
    const fallbackKey = process.env.STRIPE_SECRET_KEY
    if (!fallbackKey) {
      throw new Error("Missing Stripe test key: STRIPE_SECRET_KEY_TEST not found and no STRIPE_SECRET_KEY fallback")
    }

    if (!fallbackKey.startsWith("sk_test_")) {
      throw new Error(
        "Configuration Error: Test session requires test Stripe key, but live key provided in STRIPE_SECRET_KEY",
      )
    }

    console.warn("⚠️ [Stripe] STRIPE_SECRET_KEY_TEST not found, using STRIPE_SECRET_KEY as fallback for test session")
    return {
      client: new Stripe(fallbackKey, { apiVersion: "2024-06-20" }),
      mode: "test",
      keyType: "STRIPE_SECRET_KEY (fallback)",
    }
  } else {
    // For live sessions, use STRIPE_SECRET_KEY (should be live) since we don't have STRIPE_SECRET_KEY_LIVE
    const liveKey = process.env.STRIPE_SECRET_KEY
    if (!liveKey) {
      throw new Error("Missing Stripe live key: STRIPE_SECRET_KEY not found")
    }

    if (!liveKey.startsWith("sk_live_")) {
      throw new Error(
        "Configuration Error: Live session requires live Stripe key, but test key provided in STRIPE_SECRET_KEY",
      )
    }

    console.log("✅ [Stripe] Using STRIPE_SECRET_KEY for live session")
    return {
      client: new Stripe(liveKey, { apiVersion: "2024-06-20" }),
      mode: "live",
      keyType: "STRIPE_SECRET_KEY",
    }
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
    // Production: use main key (should be live)
    stripeKey = process.env.STRIPE_SECRET_KEY
    keySource = "STRIPE_SECRET_KEY"
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
 * Validates a Stripe session and returns detailed debug info
 */
export async function validateStripeSession(sessionId: string) {
  try {
    const stripeConfig = getStripeClientForSession(sessionId)

    console.log(`🔍 [Stripe] Validating session ${sessionId.substring(0, 20)}... with ${stripeConfig.keyType}`)

    const session = await stripeConfig.client.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "line_items"],
    })

    return {
      success: true,
      session,
      stripeConfig,
      debug: {
        sessionId: session.id,
        status: session.status,
        payment_status: session.payment_status,
        mode: session.mode,
        created: new Date(session.created * 1000),
        expires_at: session.expires_at ? new Date(session.expires_at * 1000) : null,
        metadata: session.metadata,
        stripeMode: stripeConfig.mode,
        keyUsed: stripeConfig.keyType,
      },
    }
  } catch (error: any) {
    console.error(`❌ [Stripe] Session validation failed:`, {
      sessionId: sessionId.substring(0, 20) + "...",
      error: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
    })

    return {
      success: false,
      error,
      debug: {
        sessionId: sessionId.substring(0, 20) + "...",
        errorType: error.type,
        errorCode: error.code,
        statusCode: error.statusCode,
        message: error.message,
        isExpired: error.code === "resource_missing" && error.message?.includes("expired"),
        isNotFound: error.statusCode === 404,
        recommendation:
          error.statusCode === 404
            ? "Verify the session ID is correct and exists in your Stripe dashboard"
            : "Check your Stripe configuration and try again",
      },
    }
  }
}

/**
 * Legacy support - maintains backward compatibility
 */
export const stripe = getEnvironmentStripeClient()
export default stripe
