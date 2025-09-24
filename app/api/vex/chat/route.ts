import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { NextResponse } from "next/server"

export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await request.json()

    console.log("[v0] Processing chat with AI SDK")

    // Convert UI messages to model format
    const modelMessages = convertToModelMessages(messages)

    // Add system message for Vex personality
    const systemMessage = {
      role: "system" as const,
      content: `You are Vex, an AI assistant specialized in helping content creators build and optimize their digital product bundles. You're friendly, knowledgeable, and focused on helping users create profitable bundles.

Your capabilities:
- Analyze content and suggest bundle compositions
- Generate compelling titles and descriptions
- Recommend optimal pricing strategies
- Decide what content should be free vs paid
- Provide marketing insights and positioning advice

Personality:
- Friendly and approachable
- Business-savvy and strategic
- Creative with naming and descriptions
- Data-driven with pricing recommendations

Always ask clarifying questions to understand:
- What type of content they have
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
4. List of what should be free vs paid content
5. Marketing positioning advice`,
    }

    const result = streamText({
      model: "groq/llama3-70b-8192",
      messages: [systemMessage, ...modelMessages],
      temperature: 0.7,
      maxOutputTokens: 1000,
      abortSignal: request.signal,
    })

    console.log("[v0] Streaming response with AI SDK")

    return result.toUIMessageStreamResponse({
      onFinish: async ({ isAborted, usage }) => {
        if (isAborted) {
          console.log("[v0] Chat stream aborted")
        } else {
          console.log("[v0] Chat completed, usage:", usage)
        }
      },
    })
  } catch (error) {
    console.error("❌ Vex chat error:", error)
    return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 })
  }
}
