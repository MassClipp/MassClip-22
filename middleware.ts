import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Get the hostname from the request
  const hostname = request.headers.get("host") || ""
  const url = request.nextUrl.clone()

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

  // Continue with the request if no redirect is needed
  return NextResponse.next()
}

// Only run the middleware on specific paths
export const config = {
  matcher: [
    // Match all paths except for API routes, static files, etc.
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
