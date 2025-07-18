import { type NextRequest, NextResponse } from "next/server"
import { getSiteUrl, isPreviewEnvironment, isProductionEnvironment } from "@/lib/url-utils"

async function getEnvironmentInfo(request: NextRequest) {
  return {
    // Environment variables
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SITE_URL_2: process.env.NEXT_PUBLIC_SITE_URL_2,

    // Calculated values
    calculatedSiteUrl: getSiteUrl(),
    isPreview: isPreviewEnvironment(),
    isProduction: isProductionEnvironment(),

    // Request info
    requestUrl: request.url,
    requestHeaders: {
      host: request.headers.get("host"),
      "x-forwarded-host": request.headers.get("x-forwarded-host"),
      "x-forwarded-proto": request.headers.get("x-forwarded-proto"),
    },

    // Timestamp
    timestamp: new Date().toISOString(),
  }
}

export async function GET(request: NextRequest) {
  try {
    const environmentInfo = await getEnvironmentInfo(request)

    console.log("🌐 Environment Check:", environmentInfo)

    return NextResponse.json(environmentInfo)
  } catch (error: any) {
    console.error("❌ Environment check error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
