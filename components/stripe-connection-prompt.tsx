"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ExternalLink, CheckCircle, AlertCircle, Link } from "lucide-react"

interface StripeConnectionStatus {
  connected: boolean
  accountId?: string
  status: string
  requiresAction: boolean
}

interface StripeConnectionPromptProps {
  onConnectionSuccess?: () => void
}

export default function StripeConnectionPrompt({ onConnectionSuccess }: StripeConnectionPromptProps) {
  const [user, loading, error] = useAuthState(auth)
  const [connectionStatus, setConnectionStatus] = useState<StripeConnectionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [accountId, setAccountId] = useState("")
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | "">("")

  // Get Firebase ID token
  const getIdToken = async () => {
    if (!user) {
      console.log("❌ No user available for token")
      return null
    }

    try {
      const token = await user.getIdToken(true) // Force refresh
      console.log("✅ Got Firebase ID token, length:", token.length)
      return token
    } catch (error) {
      console.error("❌ Failed to get ID token:", error)
      return null
    }
  }

  // Test authentication first
  const testAuth = async () => {
    if (!user) {
      console.log("⏳ User not available yet, skipping auth test")
      return false
    }

    try {
      console.log("🧪 Testing authentication...")

      const token = await getIdToken()
      if (!token) {
        throw new Error("Failed to get authentication token")
      }

      const response = await fetch("/api/test-auth", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      console.log("📡 Test auth response:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("❌ Auth test failed:", errorData)
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("✅ Auth test passed:", data)
      return true
    } catch (error) {
      console.error("❌ Auth test error:", error)
      setMessage(`Authentication test failed: ${error instanceof Error ? error.message : "Unknown error"}`)
      setMessageType("error")
      return false
    }
  }

  // Check connection status
  const checkConnectionStatus = async () => {
    if (!user) {
      console.log("⏳ User not available yet, skipping status check")
      return
    }

    setIsLoading(true)
    setMessage("")
    setMessageType("")

    try {
      // Test auth first
      const authWorking = await testAuth()
      if (!authWorking) {
        return
      }

      console.log("🔍 Checking Stripe connection status...")

      const token = await getIdToken()
      if (!token) {
        throw new Error("Failed to get authentication token")
      }

      const response = await fetch("/api/stripe/connection-status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      console.log("📡 Connection status response:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("✅ Connection status data:", data)
      setConnectionStatus(data)
    } catch (error) {
      console.error("❌ Error checking connection status:", error)
      setMessage(`Error checking connection: ${error instanceof Error ? error.message : "Unknown error"}`)
      setMessageType("error")
    } finally {
      setIsLoading(false)
    }
  }

  // Link existing account
  const linkAccount = async () => {
    if (!accountId.trim()) {
      setMessage("Please enter a Stripe Account ID")
      setMessageType("error")
      return
    }

    if (!user) {
      setMessage("User not authenticated")
      setMessageType("error")
      return
    }

    setIsLinking(true)
    setMessage("")
    setMessageType("")

    try {
      console.log("🔗 Linking Stripe account:", accountId)

      const token = await getIdToken()
      if (!token) {
        throw new Error("Failed to get authentication token")
      }

      const response = await fetch("/api/stripe/connect/link-account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId: accountId.trim() }),
      })

      console.log("📡 Link account response:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("✅ Link account success:", data)

      setMessage("Account linked successfully!")
      setMessageType("success")
      setAccountId("")

      // Refresh connection status
      await checkConnectionStatus()

      // Call success callback
      if (onConnectionSuccess) {
        onConnectionSuccess()
      }
    } catch (error) {
      console.error("❌ Error linking account:", error)
      setMessage(`Error linking account: ${error instanceof Error ? error.message : "Unknown error"}`)
      setMessageType("error")
    } finally {
      setIsLinking(false)
    }
  }

  // Create new Stripe account
  const createStripeAccount = async () => {
    if (!user) {
      setMessage("User not authenticated")
      setMessageType("error")
      return
    }

    try {
      console.log("🆕 Creating new Stripe account...")

      const token = await getIdToken()
      if (!token) {
        throw new Error("Failed to get authentication token")
      }

      const response = await fetch("/api/stripe/connect/onboard", {
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
      console.log("✅ Onboarding URL created:", data)

      if (data.url) {
        window.open(data.url, "_blank")
      }
    } catch (error) {
      console.error("❌ Error creating Stripe account:", error)
      setMessage(`Error creating account: ${error instanceof Error ? error.message : "Unknown error"}`)
      setMessageType("error")
    }
  }

  // Check status when user is available
  useEffect(() => {
    if (user && !loading) {
      console.log("👤 User authenticated, checking connection status")
      checkConnectionStatus()
    }
  }, [user, loading])

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading authentication...</span>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Authentication error: {error.message}</AlertDescription>
      </Alert>
    )
  }

  // Show not authenticated state
  if (!user) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Please log in to manage your Stripe connection.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Connect Your Stripe Account</h1>
        <p className="text-muted-foreground">Start accepting payments and track your earnings</p>
      </div>

      {/* Accept Payments */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 p-3 rounded-full">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">Accept Payments</h3>
              <p className="text-sm text-muted-foreground">Process payments from customers worldwide</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global Reach */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">Global Reach</h3>
              <p className="text-sm text-muted-foreground">Supported in 40+ countries</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Secure & Reliable */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 p-3 rounded-full">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">Secure & Reliable</h3>
              <p className="text-sm text-muted-foreground">Bank-level security and encryption</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Status */}
      {(connectionStatus || isLoading) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : connectionStatus?.connected ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              Stripe Connection Status
            </CardTitle>
            <CardDescription>
              {isLoading
                ? "Checking connection..."
                : connectionStatus?.connected
                  ? "Your Stripe account is connected"
                  : "Connect your Stripe account to start accepting payments"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking connection status...</span>
              </div>
            ) : connectionStatus ? (
              <div className="space-y-2">
                <p>
                  <strong>Status:</strong> {connectionStatus.status}
                </p>
                {connectionStatus.accountId && (
                  <p>
                    <strong>Account ID:</strong> {connectionStatus.accountId}
                  </p>
                )}
                {connectionStatus.requiresAction && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your Stripe account requires additional setup to accept payments.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <p>Unable to check connection status</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create New Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Create New Stripe Account
          </CardTitle>
          <CardDescription>Set up a new Stripe account to start accepting payments</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={createStripeAccount} className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            Create Stripe Account
          </Button>
          <p className="text-sm text-muted-foreground mt-2">After creating your account, return here to link it</p>
        </CardContent>
      </Card>

      {/* Link Existing Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Link Existing Account
          </CardTitle>
          <CardDescription>Connect your existing Stripe account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="accountId">Stripe Account ID</Label>
            <Input
              id="accountId"
              placeholder="acct_1234567890"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Find this in your Stripe Dashboard → Settings → Account
            </p>
          </div>

          {message && (
            <Alert className={messageType === "error" ? "border-red-500" : "border-green-500"}>
              {messageType === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Button onClick={linkAccount} disabled={isLinking || !accountId.trim()} className="w-full">
            {isLinking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Linking Account...
              </>
            ) : (
              <>
                <Link className="h-4 w-4 mr-2" />
                Link Account
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Creating a New Account</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Click "Create Stripe Account" above</li>
              <li>Fill out your business information</li>
              <li>Verify your identity</li>
              <li>Add your bank account details</li>
              <li>Return here to link your account</li>
            </ol>
          </div>

          <div>
            <h4 className="font-medium mb-2">Finding Your Account ID</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Log into your Stripe Dashboard</li>
              <li>Go to Settings → Account</li>
              <li>Copy your Account ID (starts with "acct_")</li>
              <li>Paste it in the form above</li>
            </ol>
          </div>

          <Button
            variant="outline"
            onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Stripe Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
