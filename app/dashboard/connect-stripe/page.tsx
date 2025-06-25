"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle, AlertCircle, ExternalLink, CreditCard } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface StripeAccountStatus {
  connected: boolean
  accountId?: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  requirementsCount: number
  currentlyDue: string[]
  pastDue: string[]
}

export default function ConnectStripePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [accountStatus, setAccountStatus] = useState<StripeAccountStatus | null>(null)
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      checkStripeStatus()
    }
  }, [user])

  const checkStripeStatus = async () => {
    if (!user) return

    setChecking(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/stripe/connect/status", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-user-id": user.uid,
        },
      })

      const data = await response.json()
      if (data.success) {
        setAccountStatus(data.data)
      } else {
        console.error("Failed to check Stripe status:", data.error)
      }
    } catch (error) {
      console.error("Error checking Stripe status:", error)
    } finally {
      setChecking(false)
    }
  }

  const createStripeAccount = async () => {
    if (!user) return

    setLoading(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-user-id": user.uid,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/dashboard/connect-stripe?success=true`,
          refreshUrl: `${window.location.origin}/dashboard/connect-stripe`,
        }),
      })

      const data = await response.json()
      if (data.success && data.url) {
        // Redirect to Stripe onboarding
        window.location.href = data.url
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create Stripe account",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to Stripe",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const continueOnboarding = async () => {
    if (!user || !accountStatus?.accountId) return

    setLoading(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/stripe/create-account-link", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-user-id": user.uid,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: accountStatus.accountId,
          returnUrl: `${window.location.origin}/dashboard/connect-stripe?success=true`,
          refreshUrl: `${window.location.origin}/dashboard/connect-stripe`,
        }),
      })

      const data = await response.json()
      if (data.success && data.url) {
        window.location.href = data.url
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to continue onboarding",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to continue onboarding",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const syncAccountData = async () => {
    if (!user) return

    setLoading(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/dashboard/earnings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-user-id": user.uid,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "sync_stripe" }),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "Success",
          description: "Stripe data synchronized successfully",
        })
        // Refresh status
        await checkStripeStatus()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to sync data",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Checking Stripe account status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Connect Stripe Account</h1>
        <p className="text-zinc-400 mt-1">Set up payments to start earning from your content</p>
      </div>

      {/* Account Status Card */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Stripe Account Status
          </CardTitle>
          <CardDescription>Current status of your Stripe integration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!accountStatus?.connected ? (
            <Alert className="border-yellow-600 bg-yellow-600/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No Stripe account connected. You need to connect a Stripe account to receive payments.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  {accountStatus.chargesEnabled ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="text-sm font-medium">Charges</div>
                <div className="text-xs text-zinc-400">{accountStatus.chargesEnabled ? "Enabled" : "Disabled"}</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  {accountStatus.payoutsEnabled ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="text-sm font-medium">Payouts</div>
                <div className="text-xs text-zinc-400">{accountStatus.payoutsEnabled ? "Enabled" : "Disabled"}</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  {accountStatus.detailsSubmitted ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="text-sm font-medium">Details</div>
                <div className="text-xs text-zinc-400">{accountStatus.detailsSubmitted ? "Submitted" : "Pending"}</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  {accountStatus.requirementsCount === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <div className="text-sm font-medium">Requirements</div>
                <div className="text-xs text-zinc-400">
                  {accountStatus.requirementsCount === 0 ? "Complete" : `${accountStatus.requirementsCount} pending`}
                </div>
              </div>
            </div>
          )}

          {accountStatus?.connected && accountStatus.requirementsCount > 0 && (
            <Alert className="border-yellow-600 bg-yellow-600/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your Stripe account needs additional information to enable full functionality.
                {accountStatus.currentlyDue.length > 0 && (
                  <div className="mt-2">
                    <strong>Required:</strong> {accountStatus.currentlyDue.join(", ")}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        {!accountStatus?.connected ? (
          <Button onClick={createStripeAccount} disabled={loading} size="lg">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Connect Stripe Account
              </>
            )}
          </Button>
        ) : (
          <>
            {accountStatus.requirementsCount > 0 && (
              <Button onClick={continueOnboarding} disabled={loading} size="lg">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Complete Setup
                  </>
                )}
              </Button>
            )}

            <Button variant="outline" onClick={syncAccountData} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                "Sync Data"
              )}
            </Button>

            <Button variant="outline" onClick={checkStripeStatus} disabled={loading}>
              Refresh Status
            </Button>
          </>
        )}
      </div>

      {/* Account ID Display */}
      {accountStatus?.connected && accountStatus.accountId && (
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle className="text-sm">Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs font-mono text-zinc-400">Account ID: {accountStatus.accountId}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
