import { NextResponse } from "next/server"
import OpenAI from "openai"

// Default fallback classification if OpenAI fails
const FALLBACK_CLASSIFICATION = {
  niche: "Motivation",
  tone: "Inspirational",
  speaker: "Unknown",
  content_type: "Speech",
}

export async function POST(request: Request) {
  console.log("🔍 [API] Starting classification...")

  try {
    // Parse request body
    const body = await request.json()
    const { title, transcript } = body

    // Validate input
    if (!title && !transcript) {
      console.error("❌ [API] Missing required fields")
      return NextResponse.json(
        {
          success: false,
          error: "Title or transcript is required",
        },
        { status: 400 },
      )
    }

    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ [API] Missing OpenAI API key")
      return NextResponse.json(
        {
          success: true,
          classification: FALLBACK_CLASSIFICATION,
          fallback: true,
          error: "OpenAI API key not configured",
        },
        { status: 200 },
      )
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Prepare content for classification
    const content = `Title: ${title || "No title"}
Transcript: ${transcript || "No transcript"}`

    console.log("🤖 [API] Calling OpenAI API...")
    console.log("📝 [API] Content length:", content.length)

    // Call OpenAI API with improved prompt
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a content classification expert. You must respond with ONLY a valid JSON object, no other text.

Analyze the content and return a JSON object with exactly these 4 fields:
- niche: The main category (Motivation, Business, Fitness, Mindset, Success, etc.)
- tone: The emotional style (Inspirational, Aggressive, Calm, Intense, Educational, etc.)  
- speaker: The person speaking if identifiable, otherwise "Unknown"
- content_type: The format (Speech, Interview, Commentary, Monologue, etc.)

Example response format:
{"niche":"Motivation","tone":"Inspirational","speaker":"David Goggins","content_type":"Speech"}

Respond with ONLY the JSON object, no explanations.`,
        },
        {
          role: "user",
          content: content,
        },
      ],
      temperature: 0.1, // Lower temperature for more consistent JSON
      max_tokens: 100, // Reduced for just the JSON response
    })

    // Get the response text
    const responseText = response.choices[0]?.message?.content?.trim() || ""
    console.log("📤 [API] Raw OpenAI response:", responseText)

    if (!responseText) {
      console.error("❌ [API] Empty response from OpenAI")
      return NextResponse.json(
        {
          success: true,
          classification: FALLBACK_CLASSIFICATION,
          fallback: true,
          error: "Empty response from OpenAI",
        },
        { status: 200 },
      )
    }

    let classification
    try {
      // Clean the response - remove any markdown formatting or extra text
      let cleanedResponse = responseText

      // Remove markdown code blocks if present
      cleanedResponse = cleanedResponse.replace(/```json\s*/g, "").replace(/```\s*/g, "")

      // Find JSON object in the response
      const jsonMatch = cleanedResponse.match(/\{[^}]+\}/)
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0]
      }

      console.log("🧹 [API] Cleaned response:", cleanedResponse)

      // Parse the JSON
      classification = JSON.parse(cleanedResponse)

      // Validate required fields
      const requiredFields = ["niche", "tone", "speaker", "content_type"]
      const missingFields = requiredFields.filter((field) => !classification[field])

      if (missingFields.length > 0) {
        console.warn(`⚠️ [API] Missing fields: ${missingFields.join(", ")}`)
        // Fill missing fields with fallback values
        missingFields.forEach((field) => {
          classification[field] = FALLBACK_CLASSIFICATION[field as keyof typeof FALLBACK_CLASSIFICATION]
        })
      }

      // Clean up the values (remove extra quotes, trim whitespace)
      Object.keys(classification).forEach((key) => {
        if (typeof classification[key] === "string") {
          classification[key] = classification[key].replace(/^["']|["']$/g, "").trim()
        }
      })

      console.log("✅ [API] Successfully parsed classification:", classification)

      return NextResponse.json(
        {
          success: true,
          classification,
          usage: response.usage,
          rawResponse: responseText, // Include for debugging
        },
        { status: 200 },
      )
    } catch (parseError) {
      console.error("❌ [API] JSON parse error:", parseError)
      console.error("❌ [API] Failed to parse:", responseText)

      // Try to extract values manually as fallback
      const manualClassification = {
        niche: extractValue(responseText, "niche") || "Motivation",
        tone: extractValue(responseText, "tone") || "Inspirational",
        speaker: extractValue(responseText, "speaker") || "Unknown",
        content_type: extractValue(responseText, "content_type") || "Speech",
      }

      console.log("🔄 [API] Manual extraction result:", manualClassification)

      return NextResponse.json(
        {
          success: true,
          classification: manualClassification,
          fallback: true,
          error: "Failed to parse JSON, used manual extraction",
          rawResponse: responseText,
        },
        { status: 200 },
      )
    }
  } catch (error) {
    console.error("❌ [API] Unexpected error:", error)

    return NextResponse.json(
      {
        success: true,
        classification: FALLBACK_CLASSIFICATION,
        fallback: true,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 },
    )
  }
}

// Helper function to manually extract values from text
function extractValue(text: string, field: string): string | null {
  const patterns = [
    new RegExp(`"${field}"\\s*:\\s*"([^"]+)"`, "i"),
    new RegExp(`'${field}'\\s*:\\s*'([^']+)'`, "i"),
    new RegExp(`${field}\\s*:\\s*([^,}\\n]+)`, "i"),
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1].trim().replace(/^["']|["']$/g, "")
    }
  }

  return null
}
