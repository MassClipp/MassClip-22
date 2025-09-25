import { NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 })
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 })
    }

    // Get user context if authenticated
    let userContentContext = ""
    const authHeader = request.headers.get("authorization")

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split("Bearer ")[1]
        const decodedToken = await getAuth().verifyIdToken(token)
        const userId = decodedToken.uid

        const analysisDoc = await db.collection("vex_content_analysis").doc(userId).get()
        if (analysisDoc.exists) {
          const analysisData = analysisDoc.data()
          userContentContext = `\nUSER'S CONTENT LIBRARY:\nTotal Uploads: ${analysisData?.totalUploads || 0}\nCategories: ${(analysisData?.categories || []).join(", ")}\n\nRecent uploads: ${(
            analysisData?.uploads || []
          )
            .slice(0, 5)
            .map((upload: any) => upload.title)
            .join(", ")}\n`
        }
      } catch (error) {
        // Continue without user context if auth fails
        console.log("Auth failed, continuing without user context")
      }
    }

    // Simple system prompt
    const systemPrompt = `You are Vex, an AI assistant that helps content creators with their digital products and bundles. You're friendly and knowledgeable about content creation, pricing, and marketing.${userContentContext}

Keep responses helpful and concise. When users ask about their content, reference what they have uploaded. Help them with bundle ideas, pricing strategies, and content organization.`

    // Prepare messages for API
    const apiMessages = [{ role: "system", content: systemPrompt }, ...messages]

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: apiMessages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Groq API error:", response.status, errorText)

      if (response.status === 429) {
        return NextResponse.json({
          message: {
            role: "assistant",
            content: "I'm getting a lot of requests right now! Please wait a moment and try again.",
          },
        })
      }

      return NextResponse.json(
        { error: "Failed to process chat message", details: `AI service error: ${response.status}` },
        { status: 500 },
      )
    }

    const data = await response.json()
    const assistantMessage = data.choices[0]?.message?.content

    if (!assistantMessage) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 })
    }

    return NextResponse.json({
      message: {
        role: "assistant",
        content: assistantMessage,
      },
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
