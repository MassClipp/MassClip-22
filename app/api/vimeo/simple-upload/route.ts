import { type NextRequest, NextResponse } from "next/server"
import { vimeoConfig } from "@/lib/vimeo-config"

export async function POST(request: NextRequest) {
  try {
    // Get upload details from request
    const formData = await request.formData()
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const privacy = (formData.get("privacy") as string) || "anybody"
    const userId = formData.get("userId") as string
    const size = formData.get("size") as string
    const niche = (formData.get("niche") as string) || ""
    const tag = (formData.get("tag") as string) || ""

    if (!name || !size) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    console.log("Creating simple Vimeo upload with params:", {
      name,
      size: `${(Number.parseInt(size, 10) / (1024 * 1024)).toFixed(2)} MB`,
      privacy,
    })

    // Create a new video on Vimeo
    const createResponse = await fetch("https://api.vimeo.com/me/videos", {
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
        tags: [...(niche ? [{ name: niche }] : []), ...(tag ? [{ name: tag }] : [])],
      }),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error("Vimeo API error:", errorText)

      try {
        const errorJson = JSON.parse(errorText)
        return NextResponse.json(
          {
            error: "Failed to initialize Vimeo upload",
            status: createResponse.status,
            details: errorJson.error || errorJson.developer_message || errorText,
          },
          { status: createResponse.status },
        )
      } catch (e) {
        return NextResponse.json(
          {
            error: "Failed to initialize Vimeo upload",
            status: createResponse.status,
            details: errorText,
          },
          { status: createResponse.status },
        )
      }
    }

    const uploadData = await createResponse.json()

    // Validate the response
    if (!uploadData.upload?.upload_link) {
      console.error("Missing upload_link in Vimeo response:", JSON.stringify(uploadData, null, 2))
      return NextResponse.json(
        {
          error: "Invalid response from Vimeo API",
          details: "Missing upload link in response",
        },
        { status: 500 },
      )
    }

    // Return the upload URL and other data needed for the client
    return NextResponse.json({
      uploadUrl: uploadData.upload.upload_link,
      vimeoId: uploadData.uri.split("/").pop(),
      link: uploadData.link,
    })
  } catch (error) {
    console.error("Error creating Vimeo upload:", error)
    return NextResponse.json(
      {
        error: "Failed to initialize Vimeo upload",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
