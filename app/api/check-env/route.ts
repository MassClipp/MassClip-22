import { NextResponse } from "next/server"

export async function GET() {
  // Check for required environment variables
  const requiredVars = [
    "CLOUDFLARE_R2_ENDPOINT",
    "CLOUDFLARE_R2_ACCESS_KEY_ID",
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    "CLOUDFLARE_R2_BUCKET_NAME",
    "CLOUDFLARE_R2_PUBLIC_URL",
  ]

  const envStatus = requiredVars.reduce(
    (acc, varName) => {
      acc[varName] = {
        exists: !!process.env[varName],
        // Only show first few characters of sensitive values
        preview: process.env[varName]
          ? varName.includes("KEY") || varName.includes("SECRET")
            ? `${process.env[varName]?.substring(0, 5)}...`
            : process.env[varName]
          : null,
      }
      return acc
    },
    {} as Record<string, { exists: boolean; preview: string | null }>,
  )

  return NextResponse.json({
    success: true,
    envStatus,
    allPresent: Object.values(envStatus).every((status) => status.exists),
  })
}
