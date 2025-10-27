import { NextResponse } from "next/server"

export async function GET() {
  try {
    // This will intentionally fail if we're in a server context
    // and try to access location
    const testLocation = typeof window !== "undefined" ? window.location.href : "Server context - no window"

    return NextResponse.json({
      message: "Location access test successful",
      location: testLocation,
      environment: process.env.NODE_ENV,
      isServer: typeof window === "undefined",
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error accessing location",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        environment: process.env.NODE_ENV,
        isServer: typeof window === "undefined",
      },
      { status: 500 },
    )
  }
}
