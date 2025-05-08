import { type NextRequest, NextResponse } from "next/server"
import { vimeoConfig } from "@/lib/vimeo-config"

export async function GET(request: NextRequest) {
  try {
    // Test the Vimeo API connection
    const response = await fetch("https://api.vimeo.com/me", {
      headers: {
        Authorization: `Bearer ${vimeoConfig.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.vimeo.*+json;version=3.4",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        {
          error: "Failed to connect to Vimeo API",
          status: response.status,
          details: errorText,
        },
        { status: response.status },
      )
    }

    const data = await response.json()

    // Return basic user info to confirm connection
    return NextResponse.json({
      success: true,
      user: {
        name: data.name,
        uri: data.uri,
        link: data.link,
      },
    })
  } catch (error) {
    console.error("Error testing Vimeo connection:", error)
    return NextResponse.json(
      {
        error: "Failed to test Vimeo connection",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
