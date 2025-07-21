"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"

interface StripeAccountStatus {
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  accountType: string
  country: string
}

interface ConnectionStatus {
  connected: boolean
  accountId?: string
  accountStatus?: StripeAccountStatus
  message?: string
}

export default function StripeAccountLinker() {
  const [accountId, setAccountId] = useState("")
  const [isLinking, setIsLinking] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  // Check current connection status on component mount
  useEffect(() => {
    checkConnectionStatus()
  }, [])

  const checkConnectionStatus = async () => {
    try {
      setIsCheckingStatus(true)
      const response = await fetch("/api/stripe/connection-status", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setConnectionStatus(data)

        if (data.connected && data.accountId) {
          setAccountId(data.accountId)
          setSuccess("Stripe account is already connected!")
        }
      } else {
        console.error("Failed to check connection status")
      }
    } catch (error) {
      console.error("Error checking connection status:", error)
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const handleLinkAccount = async () => {
    if (!accountId.trim()) {
      setError("Please enter your Stripe Account ID")
      return
    }

    setIsLinking(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/stripe/connect/link-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId: accountId.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess("Stripe account linked successfully!")
        setConnectionStatus({
          connected: true,
          accountId: data.accountId,
          accountStatus: data.accountStatus,
          message: data.message,
        })

        // Redirect to earnings page after successful connection
        setTimeout(() => {
          router.push("/dashboard/earnings")
        }, 2000)
      } else {
        setError(data.error || "Failed to link Stripe account")
      }
    } catch (error) {
      console.error("Error linking account:", error)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLinking(false)
    }
  }

  const handleCreateNewAccount = () => {
    window.open("https://dashboard.stripe.com/register", "_blank")
  }

  if (isCheckingStatus) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Checking connection status...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Connection Status Card */}
      {connectionStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {connectionStatus.connected ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {connectionStatus.connected ? (
              <div className="space-y-2">
                <p className="text-green-600 font-medium">✅ Stripe account connected</p>
                <p className="text-sm text-gray-600">Account ID: {connectionStatus.accountId}</p>
                {connectionStatus.accountStatus && (
                  <div className="text-sm space-y-1">
                    <p>Charges Enabled: {connectionStatus.accountStatus.chargesEnabled ? "✅" : "❌"}</p>
                    <p>Payouts Enabled: {connectionStatus.accountStatus.payoutsEnabled ? "✅" : "❌"}</p>
                    <p>Details Submitted: {connectionStatus.accountStatus.detailsSubmitted ? "✅" : "❌"}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-yellow-600">No Stripe account connected</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Link Account Card */}
      {!connectionStatus?.connected && (
        <Card>
          <CardHeader>
            <CardTitle>Link Existing Stripe Account</CardTitle>
            <CardDescription>
              If you already have a Stripe account, enter your Account ID below to connect it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="accountId" className="text-sm font-medium">
                Stripe Account ID
              </label>
              <Input
                id="accountId"
                type="text"
                placeholder="acct_1234567890"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                disabled={isLinking}
              />
              <p className="text-xs text-gray-500">
                Find your Account ID in your Stripe Dashboard under Settings → Account details
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <Button onClick={handleLinkAccount} disabled={isLinking || !accountId.trim()} className="w-full">
              {isLinking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Linking Account...
                </>
              ) : (
                "Link Account"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create New Account Card */}
      {!connectionStatus?.connected && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Stripe Account</CardTitle>
            <CardDescription>Don't have a Stripe account yet? Create one to start accepting payments.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Quick 5-minute setup</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>2.9% + 30¢ per transaction</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Automatic payouts to your bank</span>
              </div>
            </div>

            <Button onClick={handleCreateNewAccount} variant="outline" className="w-full bg-transparent">
              <ExternalLink className="mr-2 h-4 w-4" />
              Create Stripe Account
            </Button>

            <p className="text-xs text-gray-500 mt-2">
              After creating your account, come back here and enter your Account ID to connect it.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>How to Find Your Stripe Account ID</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Log in to your Stripe Dashboard</li>
            <li>Go to Settings → Account details</li>
            <li>Your Account ID will be displayed at the top (starts with "acct_")</li>
            <li>Copy and paste it into the field above</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
