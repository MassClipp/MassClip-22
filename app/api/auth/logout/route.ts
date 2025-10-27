import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const cookieStore = cookies()

    const allCookies = cookieStore.getAll()
    allCookies.forEach((cookie) => {
      cookieStore.delete(cookie.name)
    })

    const response = NextResponse.json({
      success: true,
      message: "Successfully logged out",
    })

    response.headers.set("Cache-Control", "no-store, must-revalidate")
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
