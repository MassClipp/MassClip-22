import { type NextRequest, NextResponse } from "next/server"
import { vimeoConfig } from "@/lib/vimeo-config"

// This endpoint checks the status of a Vimeo upload
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const vimeoId = searchParams.get("vimeoId")

  if (!vimeoId) {
    return NextResponse.json({ error: "Missing vimeoId parameter" }, { status: 400 })
  }

  try {
    // Check the video status on Vimeo
    const response = await fetch(`https://api.vimeo.com/videos/${vimeoId}`, {
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
          error: "Failed to get video status",
          status: response.status,
          details: errorText,
        },
        { status: response.status },
      )
    }

    const data = await response.json()

    return NextResponse.json({
      status: data.status,
      transcode: data.transcode,
      upload: data.upload,
      name: data.name,
      link: data.link,
      player_embed_url: data.player_embed_url,
    })
  } catch (error) {
    console.error("Error checking video status:", error)
    return NextResponse.json(
      {
        error: "Failed to check video status",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
