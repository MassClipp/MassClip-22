import { NextResponse } from "next/server"
import { vimeoConfig, isVimeoConfigured } from "@/lib/vimeo-config"

export async function GET() {
  // This endpoint is for debugging Vimeo configuration issues
  // It doesn't expose actual tokens but shows if they're set

  const configStatus = {
    isConfigured: isVimeoConfigured(),
    hasAccessToken: Boolean(vimeoConfig.accessToken),
    hasUserId: Boolean(vimeoConfig.userId),
    hasClientId: Boolean(vimeoConfig.clientId),
    hasClientSecret: Boolean(vimeoConfig.clientSecret),
    environment: process.env.NODE_ENV,
    // Add partial token info for debugging (first/last few chars only)
    accessTokenHint: vimeoConfig.accessToken
      ? `${vimeoConfig.accessToken.substring(0, 4)}...${vimeoConfig.accessToken.substring(vimeoConfig.accessToken.length - 4)}`
      : "not set",
    userIdHint: vimeoConfig.userId
      ? `${vimeoConfig.userId.substring(0, 2)}...${vimeoConfig.userId.substring(vimeoConfig.userId.length - 2)}`
      : "not set",
  }

  // Test if we can actually connect to Vimeo
  let connectionTest = { success: false, error: null, details: null }

  if (isVimeoConfigured()) {
    try {
      const response = await fetch("https://api.vimeo.com/me", {
        headers: {
          Authorization: `Bearer ${vimeoConfig.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.vimeo.*+json;version=3.4",
        },
      })

      if (response.ok) {
        const data = await response.json()
        connectionTest = {
          success: true,
          accountName: data.name,
          accountType: data.account_type,
          uploadQuota: data.upload_quota
            ? {
                space: data.upload_quota.space,
                periodic: data.upload_quota.periodic,
              }
            : null,
        }
      } else {
        const errorText = await response.text()
        connectionTest = {
          success: false,
          error: `API Error (${response.status})`,
          details: errorText.substring(0, 200), // Limit the error text
        }
      }
    } catch (error) {
      connectionTest = {
        success: false,
        error: "Connection Error",
        details: error instanceof Error ? error.message : String(error),
      }
    }
  }

  return NextResponse.json({
    config: configStatus,
    connectionTest,
  })
}
