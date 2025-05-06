import { NextResponse } from "next/server"
import { getSiteUrl } from "@/lib/url-utils"

export async function GET() {
  return NextResponse.json({
    siteUrl: getSiteUrl(),
    hardcodedUrl: "https://massclip.pro",
    envUrl: process.env.NEXT_PUBLIC_SITE_URL || "not set",
    envUrl2: process.env.NEXT_PUBLIC_SITE_URL_2 || "not set",
  })
}
