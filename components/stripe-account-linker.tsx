"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle, ExternalLink, LinkIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

interface StripeAccountStatus {
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  accountType: string
  country: string
  email?: string
  businessType?: string
  stripeData?: {
    created: number
    defaultCurrency: string
    businessProfile: any
  }
}

interface ConnectionStatus {
  connected: boolean
  accountId?: string
  accountStatus?: StripeAccountStatus
  message?: string
}

export function StripeAccountLinker() {
  const { user } = useAuth()
  const [accountId, setAccountId] = useState("")
  const [isLinking, setIsLinking] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  // Check current connection status on component mount and when user changes
  useEffect(() => {
    if (user) {
      checkConnectionStatus()
    } else {
      setIsCheckingStatus(false)
      setConnectionStatus({ connected: false })
    }
  }, [user])

  const getAuthHeaders = async () => {
    if (!user) {
      throw new Error("User not authenticated")
    }

    try {
      // Get fresh ID token
      const idToken = await user.getIdToken(true) // Force refresh
      console.log("🔑 Got fresh ID token")
      return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      }
    } catch (error) {
      console.error("Failed to get ID token:", error)
      throw new Error("Failed to get authentication token")
    }
  }

  const checkConnectionStatus = async () => {
    if (!user) {
      setIsCheckingStatus(false)
      return
    }

    try {
      setIsCheckingStatus(true)
      console.log("🔍 Checking connection status...")

      const headers = await getAuthHeaders()

      const response = await fetch("/api/stripe/connection-status", {
        method: "GET",
        headers,
      })

      console.log("📡 Connection status response:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("📊 Connection status data:", data)
        setConnectionStatus(data)

        if (data.connected && data.accountId) {
          setAccountId(data.accountId)
          setSuccess("Stripe account is already connected!")
        }
      } else {
        console.error("Failed to check connection status:", response.status)
        const errorData = await response.json().catch(() => ({}))
        console.error("Error response:", errorData)
        setConnectionStatus({ connected: false })
      }
    } catch (error) {
      console.error("Error checking connection status:", error)
      setConnectionStatus({ connected: false })
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const handleLinkAccount = async () => {
    if (!accountId.trim()) {
      setError("Please enter your Stripe Account ID")
      return
    }

    if (!user) {
      setError("Please log in first to link your Stripe account")
      return
    }

    setIsLinking(true)
    setError("")
    setSuccess("")

    try {
      console.log("🔗 Starting account linking process...")
      const headers = await getAuthHeaders()

      const response = await fetch("/api/stripe/connect/link-account", {
        method: "POST",
        headers,
        body: JSON.stringify({ accountId: accountId.trim() }),
      })

      console.log("📡 Link account response:", response.status)
      const data = await response.json()
      console.log("📊 Link account data:", data)

      if (data.success) {
        setSuccess("Stripe account linked successfully! Redirecting to earnings page...")
        setConnectionStatus({
          connected: true,
          accountId: data.accountId,
          accountStatus: data.accountStatus,
          message: data.message,
        })

        // Redirect to earnings page after successful connection
        setTimeout(() => {
          router.push("/dashboard/earnings")
          router.refresh()
        }, 2000)
      } else {
        setError(data.error || "Failed to link Stripe account")
      }
    } catch (error: any) {
      console.error("Error linking account:", error)
      setError(error.message || "An unexpected error occurred. Please try again.")
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
      {/* Debug Info for Development */}
      {process.env.NODE_ENV === "development" && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-700">
            <p>User: {user ? "✅ Authenticated" : "❌ Not authenticated"}</p>
            <p>User ID: {user?.uid || "N/A"}</p>
            <p>Connection Status: {connectionStatus?.connected ? "✅ Connected" : "❌ Not connected"}</p>
          </CardContent>
        </Card>
      )}

      {/* Authentication Status */}
      {!user && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need to be logged in to connect your Stripe account. Please{" "}
            <button onClick={() => router.push("/login")} className="underline hover:no-underline">
              log in
            </button>{" "}
            first.
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Status Card */}
      {connectionStatus && connectionStatus.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-green-600 font-medium">✅ Stripe account connected</p>
              <p className="text-sm text-gray-600">Account ID: {connectionStatus.accountId}</p>
              {connectionStatus.accountStatus && (
                <div className="text-sm space-y-1">
                  <p>Charges Enabled: {connectionStatus.accountStatus.chargesEnabled ? "✅" : "❌"}</p>
                  <p>Payouts Enabled: {connectionStatus.accountStatus.payoutsEnabled ? "✅" : "❌"}</p>
                  <p>Details Submitted: {connectionStatus.accountStatus.detailsSubmitted ? "✅" : "❌"}</p>
                  <p>Account Type: {connectionStatus.accountStatus.accountType}</p>
                  <p>Country: {connectionStatus.accountStatus.country}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Link Account Card */}
      {!connectionStatus?.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Link Existing Account
            </CardTitle>
            <CardDescription>Connect your existing Stripe account to start receiving payments</CardDescription>
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
                disabled={isLinking || !user}
              />
              <p className="text-xs text-gray-500">Find this in your Stripe Dashboard → Settings → Account details</p>
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

            <Button onClick={handleLinkAccount} disabled={isLinking || !accountId.trim() || !user} className="w-full">
              {isLinking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying & Linking Account...
                </>
              ) : (
                <>
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Link Account
                </>
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
            <CardDescription>Set up a new Stripe account to start accepting payments</CardDescription>
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

            <p className="text-xs text-gray-500 mt-2">After creating your account, return here to link it</p>
          </CardContent>
        </Card>
      )}

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Stripe Connect Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <h4 className="font-medium">Link Your Account</h4>
                <p className="text-sm text-gray-600">Enter your Stripe Account ID to connect it to MassClip</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <h4 className="font-medium">Verification</h4>
                <p className="text-sm text-gray-600">We verify your account with Stripe's API and check its status</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <h4 className="font-medium">Start Earning</h4>
                <p className="text-sm text-gray-600">
                  Customers can purchase your content and payments flow directly to your account
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Creating a New Account</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Click "Create Stripe Account" above</li>
                <li>Fill out your business information</li>
                <li>Verify your identity</li>
                <li>Add your bank account details</li>
                <li>Return here to link your account</li>
              </ol>
            </div>

            <div>
              <h4 className="font-medium mb-2">Finding Your Account ID</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Log in to your Stripe Dashboard</li>
                <li>Go to Settings → Account details</li>
                <li>Your Account ID will be displayed at the top (starts with "acct_")</li>
                <li>Copy and paste it into the field above</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default StripeAccountLinker
