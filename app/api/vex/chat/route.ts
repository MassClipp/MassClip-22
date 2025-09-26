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

    if (!process.env.GROQ_API) {
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

    const systemPrompt = `You are Vex, a friendly AI assistant who helps content creators on MassClip turn their uploads into profitable bundles.

ABOUT MASSCLIP:
MassClip is a platform where creators upload and organize their digital content (videos, images, audio, templates, etc.) and package them into bundles to sell. You can navigate around using the dashboard, view uploads, create bundles, check analytics, and manage their storefront.

YOUR PERSONALITY:
- Conversational and enthusiastic about helping creators succeed
- Never mention technical processes, APIs, or backend operations
- Ask natural follow-up questions to understand what they want
- Be spontaneous and helpful, not rigid or robotic
- Speak directly to them, never refer to "the user"

WHAT YOU DO:
When someone asks you to create a bundle (like "make me a motivation bundle" or "create a photography pack"):

1. Look at their content library and get excited about what you see
2. Suggest a specific bundle idea with a catchy name and fair price
3. **IMMEDIATELY CREATE THE BUNDLE** - Don't ask for permission, just do it!
4. When creating, respond with "Perfect! Let me create that bundle for you right now..." then IMMEDIATELY add this special instruction:

CREATE_BUNDLE: {"title": "Bundle Name", "description": "Bundle description", "price": 15, "contentIds": ["id1", "id2", "id3"], "category": "Video Pack", "tags": ["tag1", "tag2"]}

Replace the values with the actual bundle details. This will automatically create the bundle in their account.

BUNDLE CREATION RULES:
- **ALWAYS use real content IDs from their library** - never make up fake IDs
- Group similar content that works well together
- Price fairly: $5-15 for starter packs, $15-35 for bigger collections, $35+ for premium bundles
- Create compelling names like "Ultimate Motivation Starter Kit" not just "Video Bundle"
- Include 3-8 items for good value
- Categories: Video Pack, Audio Collection, Mixed Media, Beginner Kit, Pro Bundle, etc.
- **If they don't have enough content, suggest they upload more first**

${userContentContext}

Be helpful, natural, and focus on their success. When creating bundles, use the CREATE_BUNDLE instruction format exactly as shown above with REAL content IDs only.`

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
        Authorization: `Bearer ${process.env.GROQ_API}`,
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

    let bundleJobId = null

    if (assistantMessage.includes("CREATE_BUNDLE:") && userId) {
      try {
        console.log("[v0] Vex wants to create a bundle, starting background job...")
        console.log("[v0] Original message:", assistantMessage)

        // Extract bundle data BEFORE modifying the message
        const bundleMatch = assistantMessage.match(/CREATE_BUNDLE:\s*({.*?})/s)
        console.log("[v0] Bundle match found:", !!bundleMatch)

        if (bundleMatch) {
          console.log("[v0] Bundle data string:", bundleMatch[1])
          const bundleData = JSON.parse(bundleMatch[1])
          console.log("[v0] Parsed bundle data:", bundleData)

          // Show initial message to user
          assistantMessage = assistantMessage
            .replace(
              /CREATE_BUNDLE:\s*{.*?}/s,
              "🚀 **Starting bundle creation...** I'll keep you updated on the progress!",
            )
            .trim()

          // Create background job instead of direct API call
          const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
            ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
            : process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000"

          const jobResponse = await fetch(`${baseUrl}/api/vex/bundle-jobs`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader || "",
            },
            body: JSON.stringify(bundleData),
          })

          console.log("[v0] Bundle job creation response status:", jobResponse.status)

          if (jobResponse.ok) {
            const jobResult = await jobResponse.json()
            bundleJobId = jobResult.jobId

            console.log("[v0] Bundle job created successfully:", bundleJobId)
          } else {
            const errorText = await jobResponse.text()
            console.error("[v0] Bundle job creation failed:", jobResponse.status, errorText)

            // Replace message with error
            assistantMessage = assistantMessage.replace(
              "🚀 **Starting bundle creation...** I'll keep you updated on the progress!",
              "❌ I had trouble starting the bundle creation. Let me try a different approach or you can create it manually in your dashboard.",
            )
          }
        } else {
          console.log("[v0] No valid bundle data found in CREATE_BUNDLE instruction")
        }
      } catch (error) {
        console.error("[v0] Failed to create bundle job:", error)
        assistantMessage = assistantMessage.replace(
          /🚀 \*\*Starting bundle creation\.\.\.\*\* I'll keep you updated on the progress!/,
          "❌ I encountered an error while starting bundle creation. Please try again or create it manually in your dashboard.",
        )
      }
    }

    console.log("[v0] Returning successful response")
    return NextResponse.json({
      message: {
        role: "assistant",
        content: assistantMessage,
      },
      bundleJobId, // Return job ID for status tracking
    })
  } catch (error) {
    console.error("[v0] Chat API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
