import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-session"

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
      cookies: request.cookies.getAll(),
      headers: Object.fromEntries(request.headers.entries()),
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
