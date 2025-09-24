import { NextResponse } from "next/server"
import { analyzeContentForBundling } from "@/lib/groq"

export async function POST(request: Request) {
  try {
    console.log("[v0] Testing bundle analysis...")

    const { contentItems } = await request.json()
    console.log("[v0] Content items:", contentItems)

    const suggestions = await analyzeContentForBundling(contentItems)
    console.log("[v0] Bundle suggestions:", suggestions)

    return NextResponse.json({
      success: true,
      suggestions,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Bundle analysis test failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
