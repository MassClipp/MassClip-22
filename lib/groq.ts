import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

// Export the groq provider for use in other files
export { groq }

// AI Bundling helper functions
export interface ContentAnalysis {
  title: string
  description: string
  category: string
  tags: string[]
  suggestedPrice: number
  targetAudience: string
}

export interface BundleSuggestion {
  title: string
  description: string
  price: number
  contentIds: string[]
  category: string
  tags: string[]
  reasoning: string
}

export async function analyzeContentForBundling(contentItems: any[]): Promise<BundleSuggestion[]> {
  try {
    // Prepare content data for AI analysis
    const contentSummary = contentItems.map((item) => ({
      id: item.id,
      title: item.title || item.filename,
      type: item.contentType,
      mimeType: item.mimeType,
      duration: item.duration,
      fileSize: item.fileSize,
      filename: item.filename,
    }))

    const prompt = `
You are an AI assistant that helps content creators organize their uploads into sellable bundles. 

Analyze the following content items and suggest 2-3 intelligent bundles that would be valuable to customers:

Content Items:
${JSON.stringify(contentSummary, null, 2)}

For each bundle suggestion, provide:
1. A compelling title that highlights the value proposition
2. A detailed description that explains what customers get and why it's valuable
3. A suggested price in USD (consider content type, quantity, and market value)
4. Which content IDs should be included
5. A category (e.g., "Video Pack", "Audio Collection", "Mixed Media", "Beginner Kit", "Pro Bundle")
6. Relevant tags for discoverability
7. Brief reasoning for why these items work well together

Guidelines:
- Group related content by theme, style, or use case
- Consider complementary content types (e.g., video + audio, tutorials + examples)
- Price bundles competitively (typically $5-50 depending on content value)
- Create bundles with 3-8 items for optimal value perception
- Focus on customer benefits and use cases
- Use action-oriented, benefit-focused titles

Respond with a JSON array of bundle suggestions.
`

    const { text } = await generateText({
      model: "groq/llama3-70b-8192",
      prompt,
      temperature: 0.7,
      maxOutputTokens: 2000,
    })

    if (!text) {
      throw new Error("No response from AI SDK")
    }

    // Parse the JSON response
    const suggestions = JSON.parse(text) as BundleSuggestion[]
    return suggestions
  } catch (error) {
    console.error("Error analyzing content for bundling:", error)
    throw new Error("Failed to analyze content for bundling")
  }
}

export async function generateBundleMetadata(contentItems: any[]): Promise<ContentAnalysis> {
  try {
    const contentSummary = contentItems.map((item) => ({
      title: item.title || item.filename,
      type: item.contentType,
      mimeType: item.mimeType,
      duration: item.duration,
      fileSize: item.fileSize,
    }))

    const prompt = `
Analyze this content bundle and generate optimized metadata:

Content Items:
${JSON.stringify(contentSummary, null, 2)}

Generate:
1. A compelling bundle title (focus on value and benefits)
2. A detailed description that sells the bundle's value
3. A category that best describes the bundle type
4. 5-8 relevant tags for discoverability
5. A suggested price in USD based on content value
6. Target audience description

Respond with JSON format:
{
  "title": "string",
  "description": "string", 
  "category": "string",
  "tags": ["string"],
  "suggestedPrice": number,
  "targetAudience": "string"
}
`

    const { text } = await generateText({
      model: "groq/llama3-70b-8192",
      prompt,
      temperature: 0.7,
      maxOutputTokens: 1000,
    })

    if (!text) {
      throw new Error("No response from AI SDK")
    }

    return JSON.parse(text) as ContentAnalysis
  } catch (error) {
    console.error("Error generating bundle metadata:", error)
    throw new Error("Failed to generate bundle metadata")
  }
}
