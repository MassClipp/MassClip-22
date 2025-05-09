import { type NextRequest, NextResponse } from "next/server"
import { vimeoConfig, isVimeoConfigured } from "@/lib/vimeo-config"

export async function GET(request: NextRequest) {
  try {
    if (!isVimeoConfigured()) {
      return NextResponse.json({ error: "Vimeo API is not properly configured" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")
    const sort = searchParams.get("sort") || "relevant"
    const page = searchParams.get("page") || "1"
    const perPage = searchParams.get("per_page") || "12"
    const tag = searchParams.get("tag")

    let url = `https://api.vimeo.com/me/videos?page=${page}&per_page=${perPage}`

    // Add sorting
    if (sort === "date") {
      url += "&sort=date&direction=desc"
    }

    // Add search query if provided
    if (query) {
      url += `&query=${encodeURIComponent(query)}`
    }

    // Add tag filter if provided
    if (tag) {
      url += `&tags=${encodeURIComponent(tag)}`
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${vimeoConfig.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.vimeo.*+json;version=3.4",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Vimeo API error:", errorText)
      return NextResponse.json({ error: "Failed to fetch videos from Vimeo" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching videos:", error)
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 })
  }
}
