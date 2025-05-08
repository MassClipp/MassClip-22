import { NextResponse } from "next/server"
import { vimeoConfig } from "@/lib/vimeo-config"

export async function GET() {
  try {
    // Test the Vimeo API connection by making a simple request
    const response = await fetch("https://api.vimeo.com/me", {
      headers: {
        Authorization: `Bearer ${vimeoConfig.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.vimeo.*+json;version=3.4",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Vimeo API connection test failed:", errorText)

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
          error: "Failed to connect to Vimeo API",
          status: response.status,
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
