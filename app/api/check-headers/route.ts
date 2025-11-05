import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const targetUrl = url.searchParams.get("url")

  if (!targetUrl) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 })
  }

  try {
    const response = await fetch(targetUrl, { method: "HEAD" })
    const headers: Record<string, string> = {}

    response.headers.forEach((value, key) => {
      headers[key] = value
    })

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        errorType: error instanceof Error ? error.name : "Unknown",
      },
      { status: 500 },
    )
  }
}
