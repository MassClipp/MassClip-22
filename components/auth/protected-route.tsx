"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireRole?: string[]
  redirectTo?: string
  fallback?: React.ReactNode
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requireRole = [],
  redirectTo = "/login",
  fallback,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(false)

  // Check user role if required
  useEffect(() => {
    if (user && requireRole.length > 0) {
      setRoleLoading(true)

      // Get user role from API
      fetch("/api/auth/user-role", {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          setUserRole(data.role || "user")
        })
        .catch((error) => {
          console.error("Error fetching user role:", error)
          setUserRole("user")
        })
        .finally(() => {
          setRoleLoading(false)
        })
    }
  }, [user, requireRole])

  // Redirect if authentication is required but user is not authenticated
  useEffect(() => {
    if (!loading && requireAuth && !user) {
      const currentPath = window.location.pathname + window.location.search
      const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`
      router.push(redirectUrl)
    }
  }, [user, loading, requireAuth, redirectTo, router])

  // Show loading while checking authentication
  if (loading || (requireRole.length > 0 && roleLoading)) {
    return (
      fallback || (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground text-lg">Loading...</p>
          </div>
        </div>
      )
    )
  }

  // Don't render if authentication is required but user is not authenticated
  if (requireAuth && !user) {
    return null
  }

  // Check role-based access
  if (requireRole.length > 0 && userRole && !requireRole.includes(userRole)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
