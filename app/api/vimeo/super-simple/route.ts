import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("Received super simple upload request")

    // Get upload details from request
    const formData = await request.formData()
    const name = formData.get("name") as string
    const size = formData.get("size") as string

    if (!name || !size) {
      return NextResponse.json({ error: "Name and size are required" }, { status: 400 })
    }

    console.log("Creating Vimeo upload with params:", { name, size })

    // Create a new video on Vimeo (without the file yet)
    const createResponse = await fetch(`https://api.vimeo.com/me/videos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VIMEO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.vimeo.*+json;version=3.4",
      },
      body: JSON.stringify({
        upload: {
          approach: "tus",
          size: Number.parseInt(size, 10),
        },
        name,
      }),
    })

    console.log("Vimeo API response status:", createResponse.status)

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error("Vimeo API error:", errorText)
      return NextResponse.json({ error: "Failed to initialize Vimeo upload", details: errorText }, { status: 500 })
    }

    const uploadData = await createResponse.json()
    console.log("Vimeo upload created successfully:", uploadData.uri)

    // Return the upload URL and other data needed for the client
    return NextResponse.json({
      uploadUrl: uploadData.upload.upload_link,
      vimeoId: uploadData.uri.split("/").pop(),
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
