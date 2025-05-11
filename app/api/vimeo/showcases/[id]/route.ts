import { type NextRequest, NextResponse } from "next/server"
import { vimeoConfig } from "@/lib/vimeo-config"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const showcaseId = params.id

  try {
    const response = await fetch(`https://api.vimeo.com/albums/${showcaseId}`, {
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
        { error: "Failed to fetch showcase details from Vimeo", details: errorText },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching Vimeo showcase details:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch showcase details from Vimeo",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
