import { type NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const { uploadId, imageUrl } = await request.json()

    if (!uploadId || !imageUrl) {
      return NextResponse.json({ error: "Missing uploadId or imageUrl" }, { status: 400 })
    }

    console.log(`[v0] Analyzing image for upload ${uploadId}`)

    const completion = await groq.chat.completions.create({
      model: "llama-3.2-90b-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and provide a detailed description. Include: what the image shows, the style/aesthetic, colors, mood, and any text visible. Keep it concise but informative.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const description = completion.choices[0]?.message?.content || ""

    console.log(`[v0] Image analysis complete: ${description.substring(0, 100)}...`)

    // Update the upload document with the image description
    await adminDb.collection("uploads").doc(uploadId).update({
      imageDescription: description,
      imageAnalyzedAt: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      description,
    })
  } catch (error: any) {
    console.error("[v0] Error analyzing image:", error)
    return NextResponse.json(
      {
        error: "Failed to analyze image",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
