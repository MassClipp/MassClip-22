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
      // Add Firebase-specific cookies
      "firebase:authUser:AIzaSyBqJQJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8:massclip-app",
      "firebase:host:massclip-app.firebaseapp.com",
      // Add any other potential auth cookies
      "auth-token",
      "refresh-token",
      "user-session",
    ]

    authCookies.forEach((cookieName) => {
      cookieStore.delete(cookieName)
    })

    const response = NextResponse.json({
      success: true,
      message: "Successfully logged out",
      // Add timestamp to help with cache busting
      timestamp: Date.now(),
    })

    // Add headers to prevent caching and force fresh requests
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")

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
