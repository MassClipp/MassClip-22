import { NextResponse } from "next/server"

export async function GET() {
  try {
    const requiredEnvVars = [
      "STRIPE_SECRET_KEY",
      "NEXT_PUBLIC_BASE_URL",
      "FIREBASE_PROJECT_ID",
      "FIREBASE_CLIENT_EMAIL",
      "FIREBASE_PRIVATE_KEY",
    ]

    const envStatus = requiredEnvVars.map((varName) => ({
      name: varName,
      present: !!process.env[varName],
      value:
        varName.includes("SECRET") || varName.includes("PRIVATE")
          ? "[HIDDEN]"
          : process.env[varName]?.substring(0, 20) + "...",
    }))

    const allPresent = envStatus.every((env) => env.present)

    return NextResponse.json({
      allPresent,
      environment: process.env.NODE_ENV,
      envVars: envStatus,
      stripeMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "LIVE" : "TEST",
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to check environment variables",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
