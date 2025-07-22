import { NextResponse } from "next/server"

export async function GET() {
  console.log("🔧 [Environment Check] Checking environment variables...")

  const requiredEnvVars = [
    "STRIPE_SECRET_KEY",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_BASE_URL",
  ]

  const envStatus: Record<string, boolean> = {}
  let allPresent = true

  requiredEnvVars.forEach((varName) => {
    const value = process.env[varName]
    const isPresent = !!value && value.trim().length > 0
    envStatus[varName] = isPresent

    if (!isPresent) {
      allPresent = false
      console.error(`❌ [Environment Check] Missing: ${varName}`)
    } else {
      console.log(`✅ [Environment Check] Found: ${varName}`)
    }
  })

  // Check for common configuration issues
  const issues: string[] = []

  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith("sk_")) {
    issues.push("STRIPE_SECRET_KEY should start with 'sk_'")
  }

  if (
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith("pk_")
  ) {
    issues.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY should start with 'pk_'")
  }

  const isTestMode = process.env.STRIPE_SECRET_KEY?.includes("_test_")
  const publishableIsTest = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.includes("_test_")

  if (isTestMode !== publishableIsTest) {
    issues.push("Stripe secret and publishable keys don't match (one is test, one is live)")
  }

  return NextResponse.json({
    allPresent,
    envStatus,
    issues,
    isTestMode,
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
  })
}
