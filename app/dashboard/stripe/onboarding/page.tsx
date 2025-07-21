"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ExternalLink } from "lucide-react"

export default function StripeOnboardingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isRefresh = searchParams.get("refresh") === "true"

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Get Firebase ID token
  const getIdToken = async () => {
    if (!user) return null
    try {
      return await user.getIdToken()
    } catch (error) {
      console.error("Failed to get ID token:", error)
      return null
    }
  }

  // Refresh onboarding link
  const refreshOnboardingLink = async () => {
    if (!user) return

    setIsLoading(true)
    setError("")

    try {
      const token = await getIdToken()
      if (!token) throw new Error("Failed to get authentication token")

      const response = await fetch("/api/stripe/connect/refresh-onboarding-link", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl
      }
    } catch (error: any) {
      console.error("Error refreshing onboarding link:", error)
      setError(`Error refreshing link: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-refresh if this is a refresh redirect
  useEffect(() => {
    if (user && isRefresh) {
      refreshOnboardingLink()
    }
  }, [user, isRefresh])

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>Please log in to continue with Stripe onboarding.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Stripe Account Setup</CardTitle>
            <CardDescription>
              {isRefresh ? "Refreshing your Stripe onboarding link..." : "Continue setting up your Stripe account"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isRefresh ? (
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Redirecting you to Stripe...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-center text-muted-foreground">
                  Need to continue your Stripe account setup? Click the button below to get a fresh onboarding link.
                </p>

                <Button onClick={refreshOnboardingLink} disabled={isLoading} className="w-full" size="lg">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Getting Link...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Continue Stripe Setup
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <Button variant="ghost" onClick={() => router.push("/dashboard/earnings")}>
                    Back to Earnings
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
