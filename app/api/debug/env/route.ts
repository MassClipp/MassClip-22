import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Only return safe, non-sensitive environment info
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      hasBaseUrl: !!process.env.NEXT_PUBLIC_BASE_URL,
      baseUrlValue: process.env.NEXT_PUBLIC_BASE_URL,
      hasGroqKey: !!process.env.GROQ_API_KEY,
      timestamp: new Date().toISOString(),
      // Add other safe environment checks
      platform: process.platform,
      nodeVersion: process.version,
    }

    return NextResponse.json(envInfo)
  } catch (error) {
    return NextResponse.json({ error: "Failed to retrieve environment info", details: error }, { status: 500 })
  }
}
