import { NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"

export async function POST(request: Request) {
  try {
    const authResult = await verifyIdToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 })
    }

    if (!process.env.GROQ_API) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 })
    }

    // Get the first few messages to understand the conversation context
    const contextMessages = messages.slice(0, 4).map((msg: any) => ({
      role: msg.role || "user",
      content: String(msg.content || ""),
    }))

    const titlePrompt = `Based on this conversation, generate a short, descriptive title (3-6 words max) that captures the main topic or request. The title should be clear and specific.

Examples:
- "Create Photography Bundle" 
- "Video Editing Pricing Help"
- "Social Media Templates"
- "Beginner Bundle Ideas"

Conversation:
${contextMessages.map((msg) => `${msg.role}: ${msg.content}`).join("\n")}

Generate only the title, no quotes or extra text:`

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: titlePrompt }],
        max_tokens: 20,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`)
    }

    const data = await response.json()
    const title = data.choices?.[0]?.message?.content?.trim() || "New Chat"

    // Clean up the title (remove quotes, limit length)
    const cleanTitle = title
      .replace(/^["']|["']$/g, "") // Remove quotes
      .slice(0, 50) // Limit length
      .trim()

    return NextResponse.json({ title: cleanTitle || "New Chat" })
  } catch (error) {
    console.error("Error generating title:", error)
    return NextResponse.json({ error: "Failed to generate title" }, { status: 500 })
  }
}
