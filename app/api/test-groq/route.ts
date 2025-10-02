import { NextResponse } from "next/server"
import Groq from "groq-sdk"

export async function POST() {
  console.log("[v0] 🧪 Test Groq API endpoint called")

  try {
    // Check if API key exists
    const apiKey = process.env.GROQ_API_KEY
    console.log("[v0] 🔑 API Key exists:", !!apiKey)
    console.log("[v0] 🔑 API Key length:", apiKey?.length || 0)

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "GROQ_API_KEY not found in environment variables",
          apiKeyExists: false,
        },
        { status: 500 },
      )
    }

    // Try to initialize Groq client
    console.log("[v0] 🔧 Initializing Groq client...")
    const groq = new Groq({ apiKey })
    console.log("[v0] ✅ Groq client initialized")

    // Try a simple API call
    console.log("[v0] 📞 Making test API call...")
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: 'Say "Hello from Groq!"' }],
      model: "mixtral-8x7b-32768",
      max_tokens: 50,
    })

    console.log("[v0] ✅ API call successful")
    console.log("[v0] 📝 Response:", completion.choices[0]?.message?.content)

    return NextResponse.json({
      success: true,
      apiKeyExists: true,
      apiKeyLength: apiKey.length,
      testResponse: completion.choices[0]?.message?.content,
      message: "Groq API is working correctly!",
    })
  } catch (error) {
    console.error("[v0] ❌ Groq test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
