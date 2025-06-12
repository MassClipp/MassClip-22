// Helper functions for authentication

// Check if a route is an authentication route (login, signup, etc.)
export function isAuthRoute(pathname: string): boolean {
  const authRoutes = ["/login", "/signup", "/forgot-password", "/reset-password"]

  return authRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

// Check if a route is a protected route (requires authentication)
export function isProtectedRoute(pathname: string): boolean {
  const protectedPrefixes = [
    "/dashboard",
    "/account",
    "/settings",
    "/profile",
    "/creator",
    "/upload",
    "/video",
    "/product-box",
    "/purchase",
    "/subscription",
  ]

  return protectedPrefixes.some((prefix) => pathname.startsWith(prefix))
}

// Check if a route is a public route (doesn't require authentication)
export function isPublicRoute(pathname: string): boolean {
  const publicRoutes = ["/", "/pricing", "/terms", "/privacy", "/beta-notice", "/category", "/showcase"]

  return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}
