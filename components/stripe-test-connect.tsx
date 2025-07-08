"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, TestTube, CheckCircle, AlertCircle, ExternalLink, Zap, Settings, Trash2, Plus } from "lucide-react"

interface TestConnectStatus {
  hasTestAccount: boolean
  accountId: string | null
  status: string
  chargesEnabled?: boolean
  payoutsEnabled?: boolean
  detailsSubmitted?: boolean
  message: string
}

export default function StripeTestConnect() {
  const { user } = useAuth()
  const [status, setStatus] = useState<TestConnectStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isOnboarding, setIsOnboarding] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Only show in preview environment
  const isPreview =
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
    window.location.hostname.includes("v0.dev") ||
    window.location.hostname.includes("vercel.app")

  useEffect(() => {
    if (user && isPreview) {
      checkTestStatus()
    }
  }, [user, isPreview])

  const checkTestStatus = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const token = await user.getIdToken()

      const response = await fetch("/api/stripe/test-connect/status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error("Error checking test status:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const createTestAccount = async () => {
    if (!user) return

    try {
      setIsCreating(true)
      const token = await user.getIdToken()

      const response = await fetch("/api/stripe/test-connect/create-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken: token }),
      })

      const data = await response.json()

      if (data.success) {
        await checkTestStatus() // Refresh status
      } else {
        console.error("Failed to create test account:", data.error)
      }
    } catch (error) {
      console.error("Error creating test account:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const resetTestAccount = async () => {
    if (!user) return

    try {
      setIsResetting(true)
      const token = await user.getIdToken()

      const response = await fetch("/api/stripe/test-connect/cleanup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken: token }),
      })

      const data = await response.json()

      if (data.success) {
        await checkTestStatus() // Refresh status
      } else {
        console.error("Failed to reset test account:", data.error)
      }
    } catch (error) {
      console.error("Error resetting test account:", error)
    } finally {
      setIsResetting(false)
    }
  }

  const startOnboarding = async () => {
    if (!user) return

    try {
      setIsOnboarding(true)
      const token = await user.getIdToken()

      const response = await fetch("/api/stripe/test-connect/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken: token }),
      })

      const data = await response.json()

      if (data.success && data.onboardingUrl) {
        window.location.href = data.onboardingUrl
      } else if (data.onboardingComplete) {
        await checkTestStatus() // Refresh status
      }
    } catch (error) {
      console.error("Error starting onboarding:", error)
    } finally {
      setIsOnboarding(false)
    }
  }

  // Don't render if not in preview
  if (!isPreview) {
    return null
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <TestTube className="h-5 w-5" />
          Test Stripe Connect
          <Badge variant="outline" className="text-orange-600 border-orange-300">
            Preview Only
          </Badge>
        </CardTitle>
        <CardDescription className="text-orange-700">
          Create and test Stripe Connect accounts in preview environment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-orange-200 bg-orange-50">
          <Zap className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            This feature only works in preview environments for testing purposes.
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="flex items-center gap-2 text-orange-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking test account status...
          </div>
        ) : status ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {status.status === "active" ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-orange-600" />
              )}
              <span className="text-sm font-medium text-orange-800">{status.message}</span>
            </div>

            {status.accountId && (
              <div className="text-xs font-mono text-orange-600 bg-orange-100 p-2 rounded">
                Test Account: {status.accountId}
              </div>
            )}

            {status.hasTestAccount && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-orange-700">Charges:</span>
                  <Badge variant={status.chargesEnabled ? "default" : "secondary"} className="text-xs">
                    {status.chargesEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-700">Payouts:</span>
                  <Badge variant={status.payoutsEnabled ? "default" : "secondary"} className="text-xs">
                    {status.payoutsEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              {!status.hasTestAccount ? (
                <Button
                  onClick={createTestAccount}
                  disabled={isCreating}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Test Account
                    </>
                  )}
                </Button>
              ) : (
                <>
                  {status.status !== "active" && (
                    <Button
                      onClick={startOnboarding}
                      disabled={isOnboarding}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      {isOnboarding ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Complete Setup
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    onClick={checkTestStatus}
                    variant="outline"
                    className="border-orange-300 text-orange-700 hover:bg-orange-100 bg-transparent"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Refresh Status
                  </Button>

                  <Button
                    onClick={resetTestAccount}
                    disabled={isResetting}
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50 bg-transparent"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Reset Account
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>

            {status.hasTestAccount && status.status === "active" && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  ✅ Test account is ready! You can now test end-to-end purchases with real webhook data.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <Button
            onClick={checkTestStatus}
            variant="outline"
            className="border-orange-300 text-orange-700 hover:bg-orange-100 bg-transparent"
          >
            Check Test Status
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
