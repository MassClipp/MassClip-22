import { NextResponse } from "next/server"
import { groq } from "@/lib/groq"

export async function GET() {
  try {
    console.log("[v0] Testing Groq direct connection...")

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: 'Hello! Please respond with "Groq connection successful" to confirm the API is working.',
        },
      ],
      model: "llama-3.1-70b-versatile",
      temperature: 0.1,
      max_tokens: 50,
    })

    const response = completion.choices[0]?.message?.content
    console.log("[v0] Groq response:", response)

    return NextResponse.json({
      success: true,
      response,
      model: "llama-3.1-70b-versatile",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Groq test failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
