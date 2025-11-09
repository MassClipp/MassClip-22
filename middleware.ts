import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Custom domain routing is now handled differently to support Vercel Edge deployment

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || ""
  const pathname = request.nextUrl.pathname

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Allow default domains to pass through
  const isDefaultDomain =
    hostname.includes("massclip.com") ||
    hostname.includes("massclip.pro") ||
    hostname.includes("localhost") ||
    hostname.includes("vercel.app")

  if (!isDefaultDomain) {
    // This avoids Firebase Admin calls in Edge middleware
    console.log(`[Middleware] Custom domain detected: ${hostname}, redirecting to handler`)

    const url = request.nextUrl.clone()
    url.searchParams.set("customDomain", hostname)
    url.searchParams.set("originalPath", pathname)
    url.pathname = "/api/custom-domain/resolve"

    // Use fetch to call the API route and get redirect info
    try {
      const response = await fetch(url.toString())
      if (response.ok) {
        const data = await response.json()
        if (data.rewriteTo) {
          return NextResponse.rewrite(new URL(data.rewriteTo, request.url))
        }
      }
    } catch (error) {
      console.error("[Middleware] Error resolving custom domain:", error)
    }

    return NextResponse.rewrite(new URL("/domain-not-found", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
