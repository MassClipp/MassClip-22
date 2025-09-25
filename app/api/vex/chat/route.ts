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
    let userId = null
    const authHeader = request.headers.get("authorization")

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split("Bearer ")[1]
        const decodedToken = await getAuth().verifyIdToken(token)
        userId = decodedToken.uid
        console.log("[v0] User authenticated:", userId)

        const analysisDoc = await db.collection("vex_content_analysis").doc(userId).get()
        if (analysisDoc.exists) {
          const analysisData = analysisDoc.data()
          userContentContext = `

USER'S CONTENT LIBRARY:
Total Uploads: ${analysisData?.totalUploads || 0}
Categories: ${(analysisData?.categories || []).join(", ")}

Recent uploads: ${(analysisData?.uploads || [])
            .slice(0, 10)
            .map((upload: any) => `- ${upload.title} (${upload.contentType})`)
            .join("\n")}

Available content IDs for bundling: ${(analysisData?.uploads || []).map((upload: any) => upload.id).join(", ")}
`
          console.log("[v0] User context loaded")
        }
      } catch (error) {
        console.log("[v0] Auth failed, continuing without user context:", error)
      }
    }

    const systemPrompt = `You are Vex, an AI assistant specialized in helping content creators build profitable digital product bundles.

CORE CAPABILITIES:
- Analyze user's content library and suggest bundle ideas
- Create bundles by calling the bundle creation API
- Provide pricing recommendations based on content value
- Suggest marketing strategies and bundle descriptions

BUNDLE CREATION PROCESS:
When a user asks you to create a bundle (e.g., "create a photography bundle", "make a motivation pack", "build a meme bundle"):

1. ANALYZE their content library to identify relevant items
2. SUGGEST a bundle concept with:
   - Compelling title that highlights value
   - Detailed description explaining what customers get
   - Competitive pricing ($5-50 based on content value and quantity)
   - 3-8 content items that work well together
   - Relevant category and tags

3. IF USER APPROVES, immediately create the bundle by calling the API

BUNDLE CREATION GUIDELINES:
- Group content by theme, style, or use case
- Price competitively: $5-15 for starter packs, $15-35 for comprehensive bundles, $35-50+ for premium collections
- Create value-focused titles: "Ultimate Photography Starter Kit" vs "Photo Bundle"
- Write benefit-driven descriptions that explain customer value
- Include 3-8 items for optimal perceived value
- Use categories like: "Video Pack", "Audio Collection", "Mixed Media", "Beginner Kit", "Pro Bundle"

IMPORTANT: When creating bundles, you MUST use actual content IDs from the user's library. Never use placeholder or fake IDs.

${userContentContext}

Be proactive about bundle creation - when users mention wanting bundles, immediately suggest specific options based on their content.`

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

    let assistantMessage = data.choices?.[0]?.message?.content

    if (!assistantMessage) {
      console.log("[v0] No assistant message in response")
      return NextResponse.json({ error: "No response from AI" }, { status: 500 })
    }

    let bundleCreated = false
    let bundleId = null

    if (assistantMessage.includes("CREATE_BUNDLE:") && userId) {
      try {
        console.log("[v0] Vex wants to create a bundle, processing...")

        // Extract bundle data from the message
        const bundleMatch = assistantMessage.match(/CREATE_BUNDLE:\s*({.*?})/s)
        if (bundleMatch) {
          const bundleData = JSON.parse(bundleMatch[1])

          // Call the bundle creation API
          const bundleResponse = await fetch(`${request.url.replace("/chat", "/create-bundle")}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader,
            },
            body: JSON.stringify(bundleData),
          })

          if (bundleResponse.ok) {
            const bundleResult = await bundleResponse.json()
            bundleCreated = true
            bundleId = bundleResult.bundleId

            // Remove the CREATE_BUNDLE instruction from the message
            assistantMessage = assistantMessage.replace(/CREATE_BUNDLE:\s*{.*?}/s, "").trim()
            assistantMessage += `\n\n✅ **Bundle Created Successfully!**\nBundle ID: ${bundleId}\nYou can view and manage your new bundle in your dashboard.`

            console.log("[v0] Bundle created successfully:", bundleId)
          }
        }
      } catch (error) {
        console.error("[v0] Failed to create bundle:", error)
        assistantMessage +=
          "\n\n❌ I encountered an error while creating the bundle. Please try again or create it manually in your dashboard."
      }
    }

    console.log("[v0] Returning successful response")
    return NextResponse.json({
      message: {
        role: "assistant",
        content: assistantMessage,
      },
      bundleCreated,
      bundleId,
    })
  } catch (error) {
    console.error("[v0] Chat API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
