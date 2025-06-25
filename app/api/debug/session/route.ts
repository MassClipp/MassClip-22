import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-session"

// Force dynamic rendering
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Session Debug] Checking session")

    const session = await getServerSession()

    console.log("📊 [Session Debug] Session result:", {
      hasSession: !!session,
      uid: session?.uid,
      email: session?.email,
    })

    return NextResponse.json({
      success: true,
      session: session
        ? {
            uid: session.uid,
            email: session.email,
            hasSession: true,
          }
        : {
            hasSession: false,
          },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ [Session Debug] Error:", error)
    return NextResponse.json(
      {
        error: "Session check failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
