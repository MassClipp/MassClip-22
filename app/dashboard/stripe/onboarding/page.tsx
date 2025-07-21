"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function StripeOnboardingPage() {
  const searchParams = useSearchParams()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [message, setMessage] = useState("")

  const isRefresh = searchParams.get("refresh") === "true"
  const accountId = searchParams.get("account")

  useEffect(() => {
    if (isRefresh) {
      setMessage("Your onboarding session expired. Click below to continue where you left off.")
    }
  }, [isRefresh])

  const handleRefreshOnboarding = async () => {
    setIsRefreshing(true)

    try {
      // This would typically call your refresh onboarding API
      // For now, redirect back to the main onboarding page
      window.location.href = "/dashboard/earnings"
    } catch (error) {
      console.error("Error refreshing onboarding:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Stripe Onboarding
          </CardTitle>
          <CardDescription>Complete your Stripe account setup to start accepting payments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRefresh && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {accountId && (
            <div className="text-sm text-muted-foreground">
              <p>
                Account ID: <code className="bg-muted px-2 py-1 rounded">{accountId}</code>
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Button onClick={handleRefreshOnboarding} disabled={isRefreshing} className="w-full">
              {isRefreshing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Continue Onboarding
                </>
              )}
            </Button>

            <Link href="/dashboard/earnings">
              <Button variant="outline" className="w-full bg-transparent">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
