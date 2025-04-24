import { type NextRequest, NextResponse } from "next/server"
import { vimeoConfig } from "@/lib/vimeo-config"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url)
  const page = searchParams.get("page") || "1"
  const perPage = searchParams.get("per_page") || "20"
  const showcaseId = params.id

  try {
    const response = await fetch(
      `https://api.vimeo.com/albums/${showcaseId}/videos?page=${page}&per_page=${perPage}&fields=uri,name,description,link,duration,width,height,created_time,modified_time,pictures,tags,stats,categories,user,download`,
      {
        headers: {
          Authorization: `Bearer ${vimeoConfig.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.vimeo.*+json;version=3.4",
        },
      },
    )

    // Check if response is OK
    if (!response.ok) {
      // Try to get error text, but handle cases where it might not be valid JSON
      let errorDetails = "Unknown error"
      try {
        const errorText = await response.text()
        // Check if the error text is HTML (like in the error you received)
        if (errorText.trim().startsWith("<!DOCTYPE html>") || errorText.trim().startsWith("<html")) {
          errorDetails = `Vimeo API returned HTML instead of JSON. Status: ${response.status}`
        } else {
          // Try to parse as JSON
          try {
            const errorJson = JSON.parse(errorText)
            errorDetails = errorJson.error || errorJson.message || errorText
          } catch {
            // If not valid JSON, use the text
            errorDetails = errorText
          }
        }
      } catch (parseError) {
        errorDetails = `Failed to parse error response: ${parseError instanceof Error ? parseError.message : String(parseError)}`
      }

      console.error(`Vimeo API error for showcase ${showcaseId}:`, errorDetails)

      return NextResponse.json(
        {
          error: "Failed to fetch showcase videos from Vimeo",
          details: errorDetails,
          status: response.status,
          showcaseId,
        },
        { status: response.status },
      )
    }

    // Parse JSON response
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching Vimeo showcase videos:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch showcase videos from Vimeo",
        details: error instanceof Error ? error.message : String(error),
        showcaseId,
      },
      { status: 500 },
    )
  }
}
