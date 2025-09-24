import { NextResponse } from "next/server"
import { groq } from "@/lib/groq"

export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const { messages } = await request.json()

    // Get the latest user message
    const userMessage = messages[messages.length - 1]?.content || ""
    console.log("[v0] User message:", userMessage)

    console.log("[v0] Making Groq API request")
    const response = await groq.chat.completions.create({
      model: "llama3-70b-8192", // Fixed incorrect model name from llama-3.1-70b-versatile
      messages: [
        {
          role: "system",
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
        },
        ...messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    console.log("[v0] Groq API response received")
    const assistantMessage = response.choices[0]?.message?.content || ""

    return NextResponse.json({
      message: assistantMessage,
      usage: response.usage,
    })
  } catch (error) {
    console.error("❌ Vex chat error:", error)
    return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 })
  }
}
