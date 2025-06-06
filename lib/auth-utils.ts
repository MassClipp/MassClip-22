// Utility functions for authentication state management
export const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"]
export const PROTECTED_ROUTES = ["/dashboard", "/upload", "/profile", "/settings", "/subscription"]

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route))
}

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
}

export function getRedirectUrl(pathname: string, searchParams?: URLSearchParams): string {
  // Default redirect for authenticated users
  if (isAuthRoute(pathname)) {
    return "/dashboard"
  }

  // For protected routes, redirect to login with return URL
  if (isProtectedRoute(pathname)) {
    const loginUrl = new URL("/login", window.location.origin)
    loginUrl.searchParams.set("redirect", pathname)
    if (searchParams) {
      searchParams.forEach((value, key) => {
        if (key !== "redirect") {
          loginUrl.searchParams.set(key, value)
        }
      })
    }
    return loginUrl.toString()
  }

  return pathname
}
