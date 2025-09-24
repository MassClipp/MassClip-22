import { streamText, tool } from "ai"
import { groq } from "@/lib/groq"
import { z } from "zod"
import type { NextRequest } from "next/server"

export const maxDuration = 30

// Tools that Vex can use to help build bundles
const createBundleTool = tool({
  description: "Create a new bundle with the specified content, pricing, and metadata",
  inputSchema: z.object({
    title: z.string().describe("The bundle title"),
    description: z.string().describe("The bundle description"),
    price: z.number().describe("The bundle price in dollars"),
    freeContent: z.array(z.string()).describe("List of content that should be free"),
    paidContent: z.array(z.string()).describe("List of content that should be paid"),
    category: z.string().describe("The bundle category"),
    tags: z.array(z.string()).describe("Relevant tags for the bundle"),
  }),
  async *execute({ title, description, price, freeContent, paidContent, category, tags }) {
    yield { state: "creating" as const }

    // Simulate bundle creation process
    await new Promise((resolve) => setTimeout(resolve, 1500))

    yield {
      state: "ready" as const,
      bundleId: `bundle_${Date.now()}`,
      title,
      description,
      price,
      freeContent,
      paidContent,
      category,
      tags,
    }
  },
})

const analyzePricingTool = tool({
  description: "Analyze and suggest optimal pricing for a bundle based on content type and market research",
  inputSchema: z.object({
    contentTypes: z.array(z.string()).describe("Types of content in the bundle"),
    contentCount: z.number().describe("Number of items in the bundle"),
    targetAudience: z.string().describe("Target audience for the bundle"),
  }),
  async *execute({ contentTypes, contentCount, targetAudience }) {
    yield { state: "analyzing" as const }

    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Simple pricing logic based on content
    const basePrice = contentCount * 2
    const multiplier = contentTypes.includes("video") ? 1.5 : 1.2
    const suggestedPrice = Math.round(basePrice * multiplier)

    yield {
      state: "ready" as const,
      suggestedPrice,
      reasoning: `Based on ${contentCount} ${contentTypes.join(", ")} items for ${targetAudience}, I recommend $${suggestedPrice}. This accounts for content complexity and market positioning.`,
    }
  },
})

const tools = {
  createBundle: createBundleTool,
  analyzePricing: analyzePricingTool,
} as const

export async function POST(req: NextRequest) {
  const { messages } = await req.json()

  const result = streamText({
    model: groq("llama-3.1-70b-versatile"),
    messages,
    tools,
    system: `You are Vex, an AI assistant specialized in helping content creators build and optimize their digital product bundles. You're friendly, knowledgeable, and focused on helping users create profitable bundles.

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
- Smart use of free content to build trust and drive conversions`,
    temperature: 0.7,
  })

  return result.toDataStreamResponse()
}
