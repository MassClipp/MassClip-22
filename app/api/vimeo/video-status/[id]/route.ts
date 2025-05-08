import { type NextRequest, NextResponse } from "next/server"
import { vimeoConfig } from "@/lib/vimeo-config"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const videoId = params.id

  if (!videoId) {
    return NextResponse.json({ error: "Video ID is required" }, { status: 400 })
  }

  try {
    const response = await fetch(`https://api.vimeo.com/videos/${videoId}`, {
      headers: {
        Authorization: `Bearer ${vimeoConfig.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.vimeo.*+json;version=3.4",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Vimeo API error for video ${videoId}:`, errorText)
      return NextResponse.json(
        { error: "Failed to fetch video status from Vimeo", details: errorText },
        { status: response.status },
      )
    }

    const videoData = await response.json()

    // Extract relevant status information
    const status = {
      id: videoId,
      status: videoData.status,
      transcode: videoData.transcode?.status,
      isPlayable: videoData.is_playable,
      link: videoData.link,
      name: videoData.name,
      pictures: videoData.pictures,
      duration: videoData.duration,
      width: videoData.width,
      height: videoData.height,
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error(`Error fetching Vimeo video ${videoId} status:`, error)
    return NextResponse.json(
      { error: "Failed to fetch video status", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
