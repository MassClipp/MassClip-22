import { NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export const maxDuration = 30

export async function POST(request: Request) {
  try {
    console.log("[v0] Chat API called")
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.log("[v0] No messages provided")
      return NextResponse.json({ error: "No messages provided" }, { status: 400 })
    }

    if (!process.env.GROQ_API_KEY) {
      console.log("[v0] Groq API key missing")
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 })
    }

    console.log("[v0] Processing", messages.length, "messages")

    // Get user context if authenticated
    let userContentContext = ""
    const authHeader = request.headers.get("authorization")

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split("Bearer ")[1]
        const decodedToken = await getAuth().verifyIdToken(token)
        const userId = decodedToken.uid
        console.log("[v0] User authenticated:", userId)

        const analysisDoc = await db.collection("vex_content_analysis").doc(userId).get()
        if (analysisDoc.exists) {
          const analysisData = analysisDoc.data()
          userContentContext = `\nUSER'S CONTENT LIBRARY:\nTotal Uploads: ${analysisData?.totalUploads || 0}\nCategories: ${(analysisData?.categories || []).join(", ")}\n\nRecent uploads: ${(
            analysisData?.uploads || []
          )
            .slice(0, 5)
            .map((upload: any) => upload.title)
            .join(", ")}\n`
          console.log("[v0] User context loaded")
        }
      } catch (error) {
        console.log("[v0] Auth failed, continuing without user context:", error)
      }
    }

    const systemPrompt = `You are Vex, an AI assistant for content creators. Help with digital products, bundles, pricing, and marketing.${userContentContext}`

    // Ensure messages have proper format
    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((msg: any) => ({
        role: msg.role || "user",
        content: String(msg.content || msg.message || ""),
      })),
    ]

    console.log("[v0] Calling Groq API with", formattedMessages.length, "messages")

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: formattedMessages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    })

    console.log("[v0] Groq API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Groq API error:", response.status, errorText)

      return NextResponse.json(
        { error: "Failed to process chat message", details: `AI service error: ${response.status}` },
        { status: 500 },
      )
    }

    const data = await response.json()
    console.log("[v0] Groq API success, got response")

    const assistantMessage = data.choices?.[0]?.message?.content

    if (!assistantMessage) {
      console.log("[v0] No assistant message in response")
      return NextResponse.json({ error: "No response from AI" }, { status: 500 })
    }

    console.log("[v0] Returning successful response")
    return NextResponse.json({
      message: {
        role: "assistant",
        content: assistantMessage,
      },
    })
  } catch (error) {
    console.error("[v0] Chat API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
