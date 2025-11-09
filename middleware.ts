import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || ""
  const pathname = request.nextUrl.pathname

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    (pathname.includes(".") && !pathname.endsWith("/"))
  ) {
    return NextResponse.next()
  }

  // Allow default domains to pass through
  const isDefaultDomain =
    hostname.includes("massclip.com") ||
    hostname.includes("massclip.pro") ||
    hostname.includes("localhost") ||
    hostname.includes("vercel.app")

  if (isDefaultDomain) {
    return NextResponse.next()
  }

  console.log(`[v0] [Middleware] Custom domain detected: ${hostname}, path: ${pathname}`)

  try {
    // Build the absolute URL for the API route
    const protocol = request.nextUrl.protocol
    const apiUrl = new URL("/api/custom-domain/resolve", `${protocol}//${hostname}`)
    apiUrl.searchParams.set("customDomain", hostname)
    apiUrl.searchParams.set("originalPath", pathname)

    console.log(`[v0] [Middleware] Fetching resolution from: ${apiUrl.toString()}`)

    // Fetch with proper headers and timeout
    const response = await fetch(apiUrl.toString(), {
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-host": hostname,
        "x-forwarded-proto": protocol.replace(":", ""),
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    console.log(`[v0] [Middleware] Resolution response status: ${response.status}`)

    if (response.ok) {
      const data = await response.json()
      console.log(`[v0] [Middleware] Resolution data:`, data)

      if (data.rewriteTo) {
        // Create a new URL for the rewrite
        const rewriteUrl = new URL(data.rewriteTo, request.url)
        console.log(`[v0] [Middleware] Rewriting to: ${rewriteUrl.toString()}`)

        // Add custom domain info to headers for the destination page
        const response = NextResponse.rewrite(rewriteUrl)
        response.headers.set("x-custom-domain", hostname)
        response.headers.set("x-original-path", pathname)

        return response
      }
    }

    console.log(`[v0] [Middleware] Domain not found or not verified, showing error page`)
  } catch (error) {
    console.error("[v0] [Middleware] Error resolving custom domain:", error)
  }

  // Domain not found or error occurred
  return NextResponse.rewrite(new URL("/domain-not-found", request.url))
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/).*)",
  ],
}
