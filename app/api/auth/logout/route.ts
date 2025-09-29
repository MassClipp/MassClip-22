import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const cookieStore = cookies()

    const authCookies = [
      "session",
      "firebase-auth-token",
      "__session",
      "next-auth.session-token",
      "next-auth.csrf-token",
      "next-auth.callback-url",
      "auth-token",
      "refresh-token",
      "user-session",
    ]

    authCookies.forEach((cookieName) => {
      cookieStore.delete(cookieName)
    })

    const allCookies = cookieStore.getAll()
    allCookies.forEach((cookie) => {
      if (cookie.name.includes("firebase") || cookie.name.includes("auth") || cookie.name.includes("session")) {
        cookieStore.delete(cookie.name)
      }
    })

    const response = NextResponse.json({
      success: true,
      message: "Successfully logged out",
      timestamp: Date.now(),
    })

    // Add headers to prevent caching and force fresh requests
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
    response.headers.set("Clear-Site-Data", '"cache", "cookies", "storage"')

    return response
  } catch (error) {
    console.error("Error clearing session:", error)
    return NextResponse.json(
      {
        error: "Failed to clear session",
        success: false,
      },
      { status: 500 },
    )
  }
}
