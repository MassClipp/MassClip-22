import { type NextRequest, NextResponse } from "next/server"
import { generateBundleMetadata } from "@/lib/groq"
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

    console.log(`🤖 [AI] Generating metadata for ${contentItems.length} content items...`)

    const metadata = await generateBundleMetadata(contentItems)

    console.log(`✅ [AI] Generated bundle metadata: ${metadata.title}`)

    return NextResponse.json({
      success: true,
      metadata,
    })
  } catch (error) {
    console.error("❌ [AI] Error in generate-metadata API:", error)

    return NextResponse.json(
      {
        error: "Failed to generate bundle metadata",
      },
      { status: 500 },
    )
  }
}
