import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getCustomDomainByHostname } from "@/lib/custom-domain-cache"
import { db } from "@/lib/firebase-admin"

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || ""
  const pathname = request.nextUrl.pathname

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  const isDefaultDomain =
    hostname.includes("massclip.com") ||
    hostname.includes("massclip.pro") ||
    hostname.includes("localhost") ||
    hostname.includes("vercel.app")

  if (!isDefaultDomain) {
    console.log(`[Middleware] Custom domain detected: ${hostname}`)

    try {
      // Look up custom domain in database
      const customDomain = await getCustomDomainByHostname(hostname)

      if (customDomain && customDomain.verified && customDomain.status === "active") {
        // Get the user's username
        const userDoc = await db.collection("users").doc(customDomain.userId).get()

        if (userDoc.exists) {
          const userData = userDoc.data()
          const username = userData?.username

          if (username) {
            console.log(`[Middleware] Routing ${hostname} to /creator/${username}`)

            // Rewrite to the creator's storefront
            const url = request.nextUrl.clone()
            url.pathname = `/creator/${username}${pathname === "/" ? "" : pathname}`

            return NextResponse.rewrite(url)
          }
        }
      }

      // Domain not verified or doesn't exist
      console.log(`[Middleware] Domain not verified: ${hostname}`)
      return NextResponse.rewrite(new URL("/domain-not-found", request.url))
    } catch (error) {
      console.error("[Middleware] Error processing custom domain:", error)
      return NextResponse.rewrite(new URL("/domain-not-found", request.url))
    }
  }

  if (
    request.nextUrl.pathname === "/api/webhooks/stripe" ||
    request.nextUrl.pathname.startsWith("/api/webhook-handler")
  ) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
