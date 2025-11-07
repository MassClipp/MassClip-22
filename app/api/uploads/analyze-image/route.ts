import { type NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { adminDb } from "@/lib/firebase-admin"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { uploadId, imageUrl } = await request.json()

    if (!uploadId || !imageUrl) {
      return NextResponse.json({ error: "Missing uploadId or imageUrl" }, { status: 400 })
    }

    console.log(`🖼️ [Image Analysis] Analyzing image for upload ${uploadId}`)

    await adminDb.collection("uploads").doc(uploadId).update({
      imageAnalysisStatus: "processing",
      imageAnalysisStartedAt: new Date().toISOString(),
    })

    try {
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
      }

      const imageBuffer = await imageResponse.arrayBuffer()
      const base64Image = Buffer.from(imageBuffer).toString("base64")

      // Determine the image MIME type from the URL or response headers
      const contentType = imageResponse.headers.get("content-type") || "image/png"
      const base64DataUrl = `data:${contentType};base64,${base64Image}`

      console.log(`📊 [Image Analysis] Image size: ${(imageBuffer.byteLength / 1024).toFixed(2)}KB`)

      const completion = await groq.chat.completions.create({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Describe this image in detail. Focus on the main subject, colors, composition, and mood. Keep it concise but descriptive (2-3 sentences).",
              },
              {
                type: "image_url",
                image_url: {
                  url: base64DataUrl,
                },
              },
            ],
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      })

      const description = completion.choices[0]?.message?.content || "No description available"

      console.log(`✅ [Image Analysis] Generated description: ${description.substring(0, 100)}...`)

      await adminDb.collection("uploads").doc(uploadId).update({
        imageDescription: description,
        imageAnalysisStatus: "completed",
        imageAnalyzedAt: new Date().toISOString(),
      })

      return NextResponse.json({
        success: true,
        description,
      })
    } catch (analysisError: any) {
      console.error(`❌ [Image Analysis] Failed for ${uploadId}:`, analysisError)

      await adminDb
        .collection("uploads")
        .doc(uploadId)
        .update({
          imageAnalysisStatus: "failed",
          imageAnalysisError: analysisError.message || "Unknown error",
        })

      return NextResponse.json(
        {
          success: false,
          error: analysisError.message || "Image analysis failed",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Image Analysis] Route error:", error)
    return NextResponse.json(
      {
        error: "Failed to analyze image",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
