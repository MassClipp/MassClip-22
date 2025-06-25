import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API: check-session called")

    const cookieStore = await cookies()
    console.log("🔍 API: Got cookie store")

    const sessionCookie = cookieStore.get("session")
    console.log("🔍 API: Session cookie:", sessionCookie ? "Found" : "Not found")

    if (sessionCookie) {
      console.log("🔍 API: Session cookie value length:", sessionCookie.value?.length || 0)
      console.log("🔍 API: Session cookie preview:", sessionCookie.value?.substring(0, 50) + "...")
    }

    // Also check all cookies for debugging
    const allCookies = cookieStore.getAll()
    console.log(
      "🔍 API: All cookies:",
      allCookies.map((c) => c.name),
    )

    return NextResponse.json({
      hasSession: !!sessionCookie,
      sessionValue: sessionCookie?.value ? "present" : "missing",
      cookieCount: allCookies.length,
      allCookieNames: allCookies.map((c) => c.name),
    })
  } catch (error) {
    console.error("❌ API: Error checking session:", error)
    return NextResponse.json(
      {
        hasSession: false,
        sessionValue: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
