import { NextResponse } from "next/server"
import { vimeoConfig } from "@/lib/vimeo-config"

export async function GET() {
  try {
    // Test the Vimeo API connection
    const response = await fetch(`https://api.vimeo.com/users/${vimeoConfig.userId}`, {
      headers: {
        Authorization: `Bearer ${vimeoConfig.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.vimeo.*+json;version=3.4",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Vimeo API error:", errorText)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to connect to Vimeo API",
          status: response.status,
          details: errorText,
        },
        { status: response.status },
      )
    }

    const userData = await response.json()

    return NextResponse.json({
      success: true,
      message: "Successfully connected to Vimeo API",
      user: {
        name: userData.name,
        uri: userData.uri,
        link: userData.link,
        uploadQuota: userData.upload_quota,
      },
    })
  } catch (error) {
    console.error("Error testing Vimeo connection:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect to Vimeo API",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
