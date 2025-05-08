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

    if (!name) {
      return NextResponse.json({ error: "Video name is required" }, { status: 400 })
    }

    // Create a new video on Vimeo (without the file yet)
    const createResponse = await fetch(`https://api.vimeo.com/users/${vimeoConfig.userId}/videos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vimeoConfig.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.vimeo.*+json;version=3.4",
      },
      body: JSON.stringify({
        upload: {
          approach: "tus",
          size: formData.get("size") as string,
        },
        name,
        description: description || "",
        privacy: {
          view: privacy,
        },
      }),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error("Vimeo API error:", errorText)
      return NextResponse.json(
        { error: "Failed to initialize Vimeo upload", details: errorText },
        { status: createResponse.status },
      )
    }

    const uploadData = await createResponse.json()

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
      { error: "Failed to initialize Vimeo upload", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
