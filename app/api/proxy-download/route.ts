import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const targetUrl = url.searchParams.get("url")
  const filename = url.searchParams.get("filename") || "download.mp4"

  if (!targetUrl) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 })
  }

  try {
    // Fetch the file from the target URL
    const response = await fetch(targetUrl)

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch file: ${response.status} ${response.statusText}`,
        },
        { status: response.status },
      )
    }

    // Get the file content as an array buffer
    const buffer = await response.arrayBuffer()

    // Create a new response with the file content
    const newResponse = new NextResponse(buffer)

    // Set headers to force download
    newResponse.headers.set("Content-Type", "application/octet-stream")
    newResponse.headers.set("Content-Disposition", `attachment; filename="${filename}"`)
    newResponse.headers.set("Content-Length", buffer.byteLength.toString())

    // Add CORS headers
    newResponse.headers.set("Access-Control-Allow-Origin", "*")
    newResponse.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")

    return newResponse
  } catch (error) {
    console.error("Error proxying download:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
