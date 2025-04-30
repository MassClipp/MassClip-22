import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()

  // Check if this is a password reset request
  if (url.pathname === "/login" && url.searchParams.has("mode") && url.searchParams.get("mode") === "resetPassword") {
    // Get all the query parameters
    const oobCode = url.searchParams.get("oobCode")
    const apiKey = url.searchParams.get("apiKey")
    const lang = url.searchParams.get("lang")

    // Create a new URL for the reset-password page
    const resetUrl = new URL("/reset-password", "https://massclip.pro")

    // Add the query parameters
    if (oobCode) resetUrl.searchParams.set("oobCode", oobCode)
    if (apiKey) resetUrl.searchParams.set("apiKey", apiKey)
    if (lang) resetUrl.searchParams.set("lang", lang)

    // Redirect to the reset-password page
    return NextResponse.redirect(resetUrl)
  }

  // Get the hostname from the request
  const hostname = request.headers.get("host") || ""

  // Check if we're in production and not on the production domain
  const isProduction = process.env.NODE_ENV === "production"
  const isVercelPreview = process.env.NEXT_PUBLIC_VERCEL_ENV?.includes("preview")
  const isProductionDomain = hostname.includes("massclip.pro")

  // Only redirect in production and when not on the production domain
  // Skip for Vercel preview deployments
  if (isProduction && !isProductionDomain && !isVercelPreview) {
    // Create the redirect URL to the production domain
    const redirectUrl = new URL(url.pathname + url.search, "https://massclip.pro")

    // Log the redirect for debugging
    console.log(`Redirecting from ${hostname} to ${redirectUrl.toString()}`)

    // Return the redirect response
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.next()
}

// Only run the middleware on the login page
export const config = {
  matcher: "/login",
}
