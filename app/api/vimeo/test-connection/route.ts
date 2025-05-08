import { NextResponse } from "next/server"
import { vimeoConfig } from "@/lib/vimeo-config"

export async function GET() {
  try {
    // Check if we have the required Vimeo credentials
    if (!vimeoConfig.accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing Vimeo access token",
          details: "The Vimeo access token is not configured. Please check your environment variables.",
          config: {
            hasAccessToken: !!vimeoConfig.accessToken,
            hasUserId: !!vimeoConfig.userId,
          },
        },
        { status: 401 },
      )
    }

    // Test the Vimeo API by making a simple request
    const response = await fetch("https://api.vimeo.com/me", {
      headers: {
        Authorization: `Bearer ${vimeoConfig.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.vimeo.*+json;version=3.4",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorDetails = errorText

      try {
        const errorJson = JSON.parse(errorText)
        errorDetails = errorJson.error || errorJson.developer_message || errorText
      } catch (e) {
        // If parsing fails, use the original error text
      }

      return NextResponse.json(
        {
          success: false,
          error: "Vimeo API connection failed",
          status: response.status,
          details: errorDetails,
        },
        { status: response.status },
      )
    }

    const data = await response.json()

    // Return success with some basic account info
    return NextResponse.json({
      success: true,
      message: "Successfully connected to Vimeo API",
      account: {
        name: data.name,
        uri: data.uri,
        link: data.link,
      },
      uploadQuota: data.upload_quota,
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
