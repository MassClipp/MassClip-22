import { type NextRequest, NextResponse } from "next/server"
import { vimeoConfig } from "@/lib/vimeo-config"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = searchParams.get("page") || "1"
  const perPage = searchParams.get("per_page") || "10"

  try {
    const response = await fetch(
      `https://api.vimeo.com/users/${vimeoConfig.userId}/videos?page=${page}&per_page=${perPage}&fields=uri,name,description,link,duration,width,height,created_time,modified_time,pictures,tags,stats,categories,user,download`,
      {
        headers: {
          Authorization: `Bearer ${vimeoConfig.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.vimeo.*+json;version=3.4",
        },
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Vimeo API error:", errorText)
      return NextResponse.json(
        { error: "Failed to fetch videos from Vimeo", details: errorText },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching Vimeo videos:", error)
    return NextResponse.json(
      { error: "Failed to fetch videos from Vimeo", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
