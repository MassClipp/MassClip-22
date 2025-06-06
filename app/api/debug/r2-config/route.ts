import { NextResponse } from "next/server"

export async function GET() {
  try {
    const config = {
      hasR2Endpoint: !!(process.env.CLOUDFLARE_R2_ENDPOINT || process.env.R2_ENDPOINT),
      hasR2AccessKey: !!(process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID),
      hasR2SecretKey: !!(process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY),
      hasR2Bucket: !!(process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME),
      hasR2PublicUrl: !!(process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL),
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || process.env.R2_ENDPOINT || "NOT_SET",
      bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || "NOT_SET",
      publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || "NOT_SET",
    }

    console.log("🔍 [R2 Debug] Configuration check:", config)

    return NextResponse.json({
      success: true,
      config,
      allConfigured:
        config.hasR2Endpoint &&
        config.hasR2AccessKey &&
        config.hasR2SecretKey &&
        config.hasR2Bucket &&
        config.hasR2PublicUrl,
    })
  } catch (error) {
    console.error("❌ [R2 Debug] Error checking config:", error)
    return NextResponse.json({ error: "Failed to check R2 configuration" }, { status: 500 })
  }
}
