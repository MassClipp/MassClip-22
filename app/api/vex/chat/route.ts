import { NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const { messages } = await request.json()

    console.log("[v0] Processing chat with content context")

    // Get authorization header for user context
    const authHeader = request.headers.get("authorization")
    let userContentContext = ""

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split("Bearer ")[1]
        const decodedToken = await getAuth().verifyIdToken(token)
        const userId = decodedToken.uid

        const analysisDoc = await db.collection("vex_content_analysis").doc(userId).get()

        if (analysisDoc.exists) {
          const analysisData = analysisDoc.data()

          // Create detailed content context for AI
          userContentContext = `
USER'S CONTENT LIBRARY:
Total Uploads: ${analysisData?.totalUploads || 0}
Categories Found: ${(analysisData?.categories || []).join(", ")}

DETAILED CONTENT BREAKDOWN:
${JSON.stringify(analysisData?.contentByCategory || {}, null, 2)}

INDIVIDUAL CONTENT ANALYSIS:
${JSON.stringify(analysisData?.detailedAnalysis || [], null, 2)}

RECENT UPLOADS:
${(analysisData?.uploads || [])
  .slice(0, 10)
  .map((upload: any) => `- ${upload.title} (${upload.contentType}) - ${upload.description || "No description"}`)
  .join("\n")}

This user has ${analysisData?.totalUploads || 0} pieces of content. When they ask about their content, reference specific titles, categories, and provide detailed information about what they have.
`

          console.log("[v0] Loaded user content context for chat")
        }
      } catch (authError) {
        console.log("[v0] Could not load user content context:", authError)
      }
    }

    // Get the last message from the user
    const lastMessage = messages[messages.length - 1]

    if (!lastMessage || !lastMessage.content) {
      return NextResponse.json({ error: "No message content provided" }, { status: 400 })
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are Vex, an AI assistant specialized in helping content creators build and optimize their digital product bundles. You're friendly, knowledgeable, and focused on helping users create profitable bundles.

${userContentContext}

Your capabilities:
- Analyze content and suggest bundle compositions
- Generate compelling titles and descriptions
- Recommend optimal pricing strategies
- Decide what content should be free vs paid
- Provide marketing insights and positioning advice
- Reference specific user content by title and provide detailed information

Personality:
- Friendly and approachable
- Business-savvy and strategic
- Creative with naming and descriptions
- Data-driven with pricing recommendations

When users ask about their content:
- Reference specific titles and filenames from their library
- Mention categories and content types they have
- Provide detailed breakdowns of what content fits different bundle themes
- Suggest specific combinations based on their actual uploads

Always ask clarifying questions to understand:
- What type of content they have (you already know this from their library)
- Who their target audience is
- Their pricing goals and strategy
- Whether they want to include free content as lead magnets

When creating bundles, focus on:
- Value proposition and customer benefits
- Strategic pricing that maximizes revenue
- Compelling titles that drive sales
- Descriptions that highlight transformation/outcomes
- Smart use of free content to build trust and drive conversions

If the user asks you to create a bundle, provide a detailed response with:
1. Bundle title
2. Description
3. Suggested price with reasoning
4. List of what should be free vs paid content (reference their actual content)
5. Marketing positioning advice`,
          },
          {
            role: "user",
            content: lastMessage.content,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Groq API error:", response.status, errorText)
      return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 })
    }

    const data = await response.json()
    const assistantMessage = data.choices[0]?.message?.content

    if (!assistantMessage) {
      console.error("❌ No response from Groq API")
      return NextResponse.json({ error: "No response from AI" }, { status: 500 })
    }

    console.log("[v0] Chat completed successfully with content context")

    return NextResponse.json({
      message: {
        role: "assistant",
        content: assistantMessage,
      },
    })
  } catch (error) {
    console.error("❌ Vex chat error:", error)
    return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 })
  }
}
