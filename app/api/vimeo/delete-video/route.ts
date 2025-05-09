import { type NextRequest, NextResponse } from "next/server"
import { vimeoConfig, isVimeoConfigured } from "@/lib/vimeo-config"

export async function DELETE(request: NextRequest) {
  try {
    // Check if Vimeo is properly configured
    if (!isVimeoConfigured()) {
      console.error("Vimeo is not properly configured")
      return NextResponse.json(
        {
          error: "Vimeo configuration error",
          details: "Vimeo API credentials are not properly configured.",
          code: "CONFIG_ERROR",
        },
        { status: 500 },
      )
    }

    // Get video ID from the URL
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get("videoId")

    if (!videoId) {
      return NextResponse.json({ error: "Video ID is required" }, { status: 400 })
    }

    console.log(`Attempting to delete Vimeo video with ID: ${videoId}`)

    // Delete the video from Vimeo
    const deleteResponse = await fetch(`https://api.vimeo.com/videos/${videoId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${vimeoConfig.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.vimeo.*+json;version=3.4",
      },
    })

    // Check if the deletion was successful
    if (!deleteResponse.ok) {
      // For DELETE requests, a 204 No Content response is expected on success
      const errorText = await deleteResponse.text()
      console.error("Vimeo API error:", errorText)

      // Try to parse the error for more details
      let errorDetails = errorText
      let errorJson = null

      try {
        if (errorText) {
          errorJson = JSON.parse(errorText)
          errorDetails = errorJson.error || errorJson.developer_message || errorText
        }
      } catch (e) {
        // If parsing fails, use the original error text
      }

      // Check for specific error conditions
      if (deleteResponse.status === 401) {
        return NextResponse.json(
          {
            error: "Vimeo authentication failed",
            details: "Invalid or expired access token.",
            status: deleteResponse.status,
            code: "AUTH_ERROR",
          },
          { status: 401 },
        )
      }

      if (deleteResponse.status === 404) {
        return NextResponse.json(
          {
            error: "Video not found",
            details: "The video may have already been deleted or does not exist.",
            status: deleteResponse.status,
            code: "NOT_FOUND",
          },
          { status: 404 },
        )
      }

      return NextResponse.json(
        {
          error: "Failed to delete video from Vimeo",
          status: deleteResponse.status,
          details: errorDetails,
          code: "API_ERROR",
        },
        { status: deleteResponse.status },
      )
    }

    // Successful deletion (204 No Content)
    console.log(`Successfully deleted Vimeo video with ID: ${videoId}`)
    return NextResponse.json({ success: true, message: "Video successfully deleted from Vimeo" })
  } catch (error) {
    console.error("Error deleting Vimeo video:", error)
    return NextResponse.json(
      {
        error: "Failed to delete video",
        details: error instanceof Error ? error.message : String(error),
        code: "UNKNOWN_ERROR",
      },
      { status: 500 },
    )
  }
}
