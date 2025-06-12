import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    console.log("🔑 API: set-session called")

    const body = await request.json()
    console.log("🔑 API: Request body keys:", Object.keys(body))

    const { idToken } = body

    if (!idToken) {
      console.log("❌ API: No ID token provided")
      return NextResponse.json({ error: "No ID token provided" }, { status: 400 })
    }

    console.log("🔑 API: ID token received, length:", idToken.length)
    console.log("🔑 API: ID token preview:", idToken.substring(0, 50) + "...")

    // Set session cookie
    const cookieStore = await cookies()
    console.log("🔑 API: Got cookie store")

    cookieStore.set("session", idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    console.log("🔑 API: Session cookie set with options:", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    // Verify the cookie was set
    const setCookie = cookieStore.get("session")
    console.log("🔑 API: Cookie verification:", setCookie ? "Cookie found" : "Cookie not found")

    console.log("✅ API: Session cookie set successfully")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("❌ API: Error setting session:", error)
    return NextResponse.json({ error: "Failed to set session" }, { status: 500 })
  }
}
