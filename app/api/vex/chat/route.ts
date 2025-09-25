import { NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export const maxDuration = 30

async function makeGroqRequest(requestBody: any, retries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[v0] Making Groq API request (attempt ${attempt}/${retries})...`)

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      console.log(`[v0] Groq API response status: ${response.status}`)

      // If successful, return immediately
      if (response.ok) {
        return response
      }

      // If rate limited (429), wait and retry
      if (response.status === 429 && attempt < retries) {
        const waitTime = Math.pow(2, attempt) * 1000 // Exponential backoff: 2s, 4s, 8s
        console.log(`[v0] Rate limited (429), waiting ${waitTime}ms before retry...`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        continue
      }

      // For other errors or final attempt, return the response
      return response
    } catch (error) {
      console.error(`[v0] Groq API request failed (attempt ${attempt}):`, error)

      // If this is the last attempt, throw the error
      if (attempt === retries) {
        throw error
      }

      // Wait before retrying
      const waitTime = Math.pow(2, attempt) * 1000
      console.log(`[v0] Waiting ${waitTime}ms before retry...`)
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
  }

  throw new Error("All retry attempts failed")
}

export async function POST(request: Request) {
  try {
    const { messages } = await request.json()

    console.log("[v0] Processing chat with content context")
    console.log("[v0] Messages received:", messages?.length || 0)

    // Get authorization header for user context
    const authHeader = request.headers.get("authorization")
    console.log("[v0] Auth header present:", !!authHeader)

    let userContentContext = ""
    let userId = ""

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split("Bearer ")[1]
        console.log("[v0] Token extracted, length:", token?.length)

        console.log("[v0] Verifying Firebase ID token...")
        const decodedToken = await getAuth().verifyIdToken(token)
        userId = decodedToken.uid
        console.log("[v0] Token verified for user:", userId)

        const analysisDoc = await db.collection("vex_content_analysis").doc(userId).get()

        if (analysisDoc.exists) {
          const analysisData = analysisDoc.data()
          console.log("[v0] Found content analysis for user")

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
        } else {
          console.log("[v0] No content analysis found for user")
        }
      } catch (authError) {
        console.log("[v0] Could not load user content context:", {
          error: authError instanceof Error ? authError.message : "Unknown error",
          hasAuthHeader: !!authHeader,
          authHeaderFormat: authHeader?.substring(0, 20) + "...",
        })
      }
    } else {
      console.log("[v0] No valid auth header provided")
    }

    // Get the last message from the user
    const lastMessage = messages[messages.length - 1]

    if (!lastMessage || !lastMessage.content) {
      console.log("[v0] No message content provided")
      return NextResponse.json({ error: "No message content provided" }, { status: 400 })
    }

    console.log("[v0] Processing message:", lastMessage.content.substring(0, 100) + "...")

    if (!process.env.GROQ_API_KEY) {
      console.error("❌ [Vex Chat] GROQ_API_KEY environment variable is missing")
      return NextResponse.json(
        {
          error: "Server configuration error",
          details: "AI service not configured",
        },
        { status: 500 },
      )
    }

    const userMessage = lastMessage.content.toLowerCase()
    const bundleCreationKeywords = [
      "create a bundle",
      "make a bundle",
      "build a bundle",
      "create bundle",
      "make me a bundle",
      "build me a bundle",
      "generate a bundle",
    ]

    const wantsBundleCreation = bundleCreationKeywords.some((keyword) => userMessage.includes(keyword))
    console.log("[v0] Bundle creation requested:", wantsBundleCreation)

    const systemPrompt = `You are Vex, an AI assistant specialized in helping content creators build and optimize their digital product bundles. You're friendly, knowledgeable, and focused on helping users create profitable bundles.

${userContentContext}

Your capabilities:
- Analyze content and suggest bundle compositions
- Generate compelling titles and descriptions
- Recommend optimal pricing strategies
- Decide what content should be free vs paid
- Provide marketing insights and positioning advice
- Reference specific user content by title and provide detailed information
- CREATE BUNDLES AUTOMATICALLY when users request it

BUNDLE CREATION PROCESS:
When a user asks you to create a bundle (like "make me a meme template bundle"), follow this process:
1. Analyze their content library to find relevant items
2. Ask 2-3 clarifying questions about:
   - Bundle title preference (suggest a compelling one)
   - Target price range (suggest optimal pricing)
   - Any specific content they want included/excluded
3. Once you have their preferences, respond with: "I'll create that bundle for you now!" and include this EXACT format:

BUNDLE_CREATION_REQUEST:
{
  "title": "Suggested Bundle Title",
  "description": "Compelling bundle description that highlights value and outcomes",
  "price": 29.99,
  "contentIds": ["content_id_1", "content_id_2"],
  "bundleType": "category_name"
}

The contentIds should be the actual IDs or titles from their content library that match the bundle theme.

Personality:
- Friendly and approachable
- Business-savvy and strategic
- Creative with naming and descriptions
- Data-driven with pricing recommendations
- Proactive about bundle creation

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
- Smart use of free content to build trust and drive conversions`

    try {
      console.log("[v0] Making Groq API request...")

      const requestBody = {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: lastMessage.content,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false,
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      console.log(`[v0] Groq API response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Groq API error:", response.status, errorText)

        if (response.status === 429) {
          return NextResponse.json({
            message: {
              role: "assistant",
              content:
                "I'm getting a lot of requests right now! Please wait a moment and try again. I'll be ready to help you with your bundles shortly! 🚀",
            },
          })
        }

        return NextResponse.json(
          {
            error: "Failed to process chat message",
            details: `AI service error: ${response.status}`,
          },
          { status: 500 },
        )
      }

      const data = await response.json()
      let assistantMessage = data.choices[0]?.message?.content

      if (!assistantMessage) {
        console.error("❌ No response from Groq API")
        return NextResponse.json({ error: "No response from AI" }, { status: 500 })
      }

      console.log("[v0] Received AI response, length:", assistantMessage.length)

      if (assistantMessage.includes("BUNDLE_CREATION_REQUEST:")) {
        try {
          const bundleRequestMatch = assistantMessage.match(/BUNDLE_CREATION_REQUEST:\s*([\s\S]*?)(?=\n\n|\n$|$)/)

          if (bundleRequestMatch) {
            const bundleRequestText = bundleRequestMatch[1].trim()

            console.log("[v0] Raw bundle request text before processing:", bundleRequestText)
            console.log("[v0] Attempting to parse bundle request:", bundleRequestText)

            try {
              const bundleRequest = JSON.parse(bundleRequestText)
              console.log("[v0] Vex is creating a bundle:", bundleRequest)

              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
              const bundleApiUrl = `${baseUrl}/api/vex/create-bundle-v2`

              console.log("[v0] Bundle API URL construction:")
              console.log("[v0] - NEXT_PUBLIC_BASE_URL:", process.env.NEXT_PUBLIC_BASE_URL)
              console.log("[v0] - Base URL used:", baseUrl)
              console.log("[v0] - Final bundle API URL:", bundleApiUrl)
              console.log("[v0] - Request method: POST")
              console.log("[v0] - Request headers:", {
                "Content-Type": "application/json",
                Authorization: authHeader ? "Bearer [TOKEN]" : "None",
              })

              const bundleResponse = await fetch(bundleApiUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: authHeader || "",
                },
                body: JSON.stringify(bundleRequest),
              })

              const responseText = await bundleResponse.text()
              console.log("[v0] Bundle API response status:", bundleResponse.status)
              console.log("[v0] Bundle API response text:", responseText)

              if (bundleResponse.ok) {
                let bundleResult
                try {
                  bundleResult = JSON.parse(responseText)
                } catch (parseError) {
                  console.error("[v0] Failed to parse success response JSON:", parseError)
                  console.error("[v0] Response text was:", responseText)
                  throw new Error(`Invalid JSON in success response: ${parseError.message}`)
                }

                assistantMessage = assistantMessage.replace(
                  /BUNDLE_CREATION_REQUEST:[\s\S]*?(?=\n\n|\n$|$)/,
                  `✅ **Bundle Created Successfully!**

I've created your "${bundleResult.bundle.title}" bundle with ${bundleResult.bundle.contentItems} pieces of content, priced at $${bundleResult.bundle.price}.

**Bundle Details:**
- **Title:** ${bundleResult.bundle.title}
- **Price:** $${bundleResult.bundle.price}
- **Content Items:** ${bundleResult.bundle.contentItems}
- **Total Size:** ${bundleResult.bundle.totalSize}
- **Bundle ID:** ${bundleResult.bundleId}

Your bundle is now live and ready for customers! You can view and manage it in your creator dashboard.`,
                )
              } else {
                let error
                try {
                  error = responseText
                    ? JSON.parse(responseText)
                    : { error: "Unknown error", details: "No response body" }
                } catch (parseError) {
                  console.error("[v0] Failed to parse error response JSON:", parseError)
                  console.error("[v0] Error response text was:", responseText)
                  error = {
                    error: "API Error",
                    details: `HTTP ${bundleResponse.status}: ${responseText || "No response body"}`,
                    code: "PARSE_ERROR",
                  }
                }

                console.error("[v0] Bundle creation API error:", error)
                assistantMessage = assistantMessage.replace(
                  /BUNDLE_CREATION_REQUEST:[\s\S]*?(?=\n\n|\n$|$)/,
                  `❌ I encountered an issue creating your bundle: ${error.error}. ${error.code === "STRIPE_ACCOUNT_REQUIRED" ? "Please connect your Stripe account first." : "Please try again or contact support if the issue persists."}`,
                )
              }
            } catch (error: any) {
              console.error("[v0] Error processing bundle creation:", error)
              console.error("[v0] Bundle creation error details:", {
                message: error.message,
                stack: error.stack,
                assistantMessage: assistantMessage.substring(0, 200) + "...",
              })

              assistantMessage = assistantMessage.replace(
                /BUNDLE_CREATION_REQUEST:[\s\S]*?(?=\n\n|\n$|$)/,
                `❌ I encountered an error while creating your bundle. Please try again.`,
              )
            }
          }
        } catch (error) {
          console.error("[v0] Error processing bundle creation:", error)
          console.error("[v0] Bundle creation error details:", {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
            assistantMessage: assistantMessage.substring(0, 500),
          })

          assistantMessage = assistantMessage.replace(
            /BUNDLE_CREATION_REQUEST:[\s\S]*?(?=\n\n|\n$|$)/,
            "❌ I encountered an error while creating your bundle. Please try again.",
          )
        }
      }

      console.log("[v0] Chat completed successfully with content context")

      return NextResponse.json({
        message: {
          role: "assistant",
          content: assistantMessage,
        },
      })
    } catch (fetchError) {
      console.error("❌ [Vex Chat] Failed to connect to Groq API:", fetchError)

      return NextResponse.json({
        message: {
          role: "assistant",
          content: "I'm experiencing a temporary connection issue. Please try your message again in a moment! 🤖✨",
        },
      })
    }
  } catch (error) {
    console.error("❌ Vex chat error:", error)
    console.error("❌ Vex chat error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      {
        error: "Failed to process chat message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
