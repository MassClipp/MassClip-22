import { type NextRequest, NextResponse } from "next/server"
import { vimeoConfig, isVimeoConfigured } from "@/lib/vimeo-config"

export async function POST(request: NextRequest) {
  try {
    // First, check if Vimeo is properly configured
    if (!isVimeoConfigured()) {
      console.error("Vimeo is not properly configured")
      return NextResponse.json(
        {
          error: "Vimeo configuration error",
          details: "Vimeo API credentials are not properly configured. Please check your environment variables.",
          code: "CONFIG_ERROR",
        },
        { status: 500 },
      )
    }

    // Get upload details from request
    const formData = await request.formData()
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const privacy = (formData.get("privacy") as string) || "anybody"
    const userId = formData.get("userId") as string
    const size = formData.get("size") as string

    // Get niche as tag
    const niche = formData.get("niche") as string

    // Create tags array with niche if provided
    const tags = niche ? [{ name: niche }] : []

    if (!name) {
      return NextResponse.json({ error: "Video name is required" }, { status: 400 })
    }

    if (!size || isNaN(Number(size))) {
      return NextResponse.json({ error: "Valid file size is required" }, { status: 400 })
    }

    console.log("Creating Vimeo upload with params:", {
      name,
      description: description || "(No description)",
      privacy,
      size,
      userId,
      tags: tags.length > 0 ? tags.map((t) => t.name).join(", ") : "none",
    })

    // Create a new video on Vimeo (without the file yet)
    const createResponse = await fetch(`https://api.vimeo.com/me/videos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vimeoConfig.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.vimeo.*+json;version=3.4",
      },
      body: JSON.stringify({
        upload: {
          approach: "tus",
          size: Number.parseInt(size, 10),
        },
        name,
        description: description || "",
        privacy: {
          view: privacy,
        },
        tags: tags.length > 0 ? tags : undefined,
      }),
    })

    // Log the raw response for debugging
    console.log("Vimeo API response status:", createResponse.status)

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error("Vimeo API error:", errorText)

      // Try to parse the error for more details
      let errorDetails = errorText
      let errorJson = null

      try {
        errorJson = JSON.parse(errorText)
        errorDetails = errorJson.error || errorJson.developer_message || errorText
      } catch (e) {
        // If parsing fails, use the original error text
      }

      // Check for specific error conditions
      if (createResponse.status === 401) {
        return NextResponse.json(
          {
            error: "Vimeo authentication failed",
            details: "Invalid or expired access token. Please check your Vimeo credentials.",
            status: createResponse.status,
            raw: errorJson || errorText,
            code: "AUTH_ERROR",
          },
          { status: 401 },
        )
      }

      if (createResponse.status === 429) {
        return NextResponse.json(
          {
            error: "Vimeo rate limit exceeded",
            details: "Too many requests to Vimeo API. Please try again later.",
            status: createResponse.status,
            raw: errorJson || errorText,
            code: "RATE_LIMIT",
          },
          { status: 429 },
        )
      }

      return NextResponse.json(
        {
          error: "Failed to initialize Vimeo upload",
          status: createResponse.status,
          details: errorDetails,
          raw: errorJson || errorText,
          code: "API_ERROR",
        },
        { status: createResponse.status },
      )
    }

    const uploadData = await createResponse.json()

    // Log the full response for debugging
    console.log("Vimeo upload created successfully:", uploadData.uri)
    console.log("Upload link from Vimeo:", uploadData.upload?.upload_link)

    // Ensure we have the upload link
    if (!uploadData.upload?.upload_link) {
      console.error("Missing upload_link in Vimeo response:", JSON.stringify(uploadData, null, 2))
      return NextResponse.json(
        {
          error: "Invalid response from Vimeo API",
          details: "Missing upload link in response",
          debug: JSON.stringify(uploadData, null, 2),
          code: "MISSING_UPLOAD_LINK",
        },
        { status: 500 },
      )
    }

    // Return the upload URL and other data needed for the client
    return NextResponse.json({
      uploadUrl: uploadData.upload.upload_link,
      vimeoId: uploadData.uri.split("/").pop(),
      completeUri: uploadData.upload.complete_uri,
      user: uploadData.user,
      link: uploadData.link,
    })
  } catch (error) {
    console.error("Error creating Vimeo upload:", error)
    return NextResponse.json(
      {
        error: "Failed to initialize Vimeo upload",
        details: error instanceof Error ? error.message : String(error),
        code: "UNKNOWN_ERROR",
      },
      { status: 500 },
    )
  }
}
