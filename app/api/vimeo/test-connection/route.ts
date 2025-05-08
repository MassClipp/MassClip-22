import { NextResponse } from "next/server"
import { vimeoConfig } from "@/lib/vimeo-config"

export async function GET() {
  try {
    // Validate configuration
    if (!vimeoConfig.accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing Vimeo access token",
          config: {
            accessToken: "Not configured",
            userId: vimeoConfig.userId || "Not configured",
          },
        },
        { status: 400 },
      )
    }

    // Test connection to Vimeo API
    const response = await fetch("https://api.vimeo.com/me", {
      headers: {
        Authorization: `Bearer ${vimeoConfig.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.vimeo.*+json;version=3.4",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorDetails

      try {
        const errorJson = JSON.parse(errorText)
        errorDetails = errorJson.error || errorJson.developer_message || errorText
      } catch (e) {
        errorDetails = errorText
      }

      return NextResponse.json(
        {
          success: false,
          status: response.status,
          error: "Failed to connect to Vimeo API",
          details: errorDetails,
        },
        { status: response.status },
      )
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      message: "Successfully connected to Vimeo API",
      user: {
        name: data.name,
        uri: data.uri,
        link: data.link,
        account_type: data.account_type,
      },
      upload_quota: data.upload_quota,
    })
  } catch (error) {
    console.error("Error testing Vimeo connection:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to test Vimeo connection",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
