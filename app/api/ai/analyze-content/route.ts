import { type NextRequest, NextResponse } from "next/server"
import { analyzeContentForBundling } from "@/lib/groq"
import { auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(token)

    if (!decodedToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { contentItems } = await request.json()

    if (!contentItems || !Array.isArray(contentItems)) {
      return NextResponse.json({ error: "Content items are required" }, { status: 400 })
    }

    if (contentItems.length === 0) {
      return NextResponse.json({ error: "At least one content item is required" }, { status: 400 })
    }

    console.log(`🤖 [AI] Analyzing ${contentItems.length} content items for bundling...`)

    const suggestions = await analyzeContentForBundling(contentItems)

    console.log(`✅ [AI] Generated ${suggestions.length} bundle suggestions`)

    return NextResponse.json({
      success: true,
      suggestions,
      analyzed: contentItems.length,
    })
  } catch (error) {
    console.error("❌ [AI] Error in analyze-content API:", error)

    if (error instanceof Error && error.message.includes("JSON")) {
      return NextResponse.json(
        {
          error: "AI response parsing failed. Please try again.",
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to analyze content for bundling",
      },
      { status: 500 },
    )
  }
}
