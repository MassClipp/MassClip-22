import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Checking environment variables...")

    const envCheck = {
      GROQ_API: !!process.env.GROQ_API,
      GROQ_API_KEY: !!process.env.GROQ_API_KEY,
      GROQ_API_value: process.env.GROQ_API ? "SET (hidden)" : "NOT SET",
      NODE_ENV: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    }

    console.log("[v0] Environment check result:", envCheck)

    return NextResponse.json(envCheck)
  } catch (error) {
    console.error("[v0] Environment check failed:", error)
    return NextResponse.json(
      { error: "Environment check failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
