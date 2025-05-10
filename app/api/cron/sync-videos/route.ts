import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    // Call our sync endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/sync-video-processing`, {
      method: "GET",
    })

    if (!response.ok) {
      throw new Error(`Failed to sync videos: ${response.statusText}`)
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error("Error in cron job:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// This route can be called by a cron job service like Vercel Cron
export const dynamic = "force-dynamic"
