import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

export async function GET(request: NextRequest) {
  console.log("🧪 [Test OpenAI] Testing OpenAI API connection...")

  try {
    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI API key not configured",
          details: "OPENAI_API_KEY environment variable is missing",
        },
        { status: 500 },
      )
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000, // 30 second timeout for test
    })

    console.log("🔑 [Test OpenAI] API key found, testing connection...")

    try {
      // Test with a simple completion
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Say 'API test successful'" }],
        max_tokens: 10,
        temperature: 0,
      })

      console.log("✅ [Test OpenAI] API test successful")

      return NextResponse.json(
        {
          success: true,
          message: "OpenAI API connection successful",
          response: completion.choices[0]?.message?.content || "No response",
          model: completion.model,
          usage: completion.usage,
        },
        { status: 200 },
      )
    } catch (apiError: any) {
      console.error("❌ [Test OpenAI] API error:", apiError)

      return NextResponse.json(
        {
          success: false,
          error: "OpenAI API connection failed",
          details: apiError.message || "Unknown API error",
          errorType: apiError.type || "unknown",
          status: apiError.status,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [Test OpenAI] Unexpected error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "OpenAI test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
