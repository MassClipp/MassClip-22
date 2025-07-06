import { NextResponse } from "next/server"

export async function GET() {
  try {
    const vercelEnv = process.env.VERCEL_ENV || "development"
    const nodeEnv = process.env.NODE_ENV || "development"
    const isProduction = vercelEnv === "production"

    // Get the current URL for webhook configuration
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_VERCEL_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000"

    const webhookUrl = `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}/api/stripe/webhook`

    return NextResponse.json({
      vercelEnv,
      nodeEnv,
      isProduction,
      webhookUrl,
      baseUrl,
      timestamp: new Date().toISOString(),
      environmentVariables: {
        hasNextPublicAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
        hasNextPublicVercelUrl: !!process.env.NEXT_PUBLIC_VERCEL_URL,
        hasVercelUrl: !!process.env.VERCEL_URL,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to get environment information",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
