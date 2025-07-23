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
import { CheckCircle2, Clock, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface StripeConnectionStatus {
  connected: boolean
  accountId?: string
  status: string
  requiresAction: boolean
}

export interface StripeConnectionStatusProps {
  status?: "connected" | "pending" | "error"
  className?: string
}

export function StripeConnectionStatus({ status, className }: StripeConnectionStatusProps) {
  if (!status) return null

  const map = {
    connected: {
      icon: <CheckCircle2 className="text-emerald-500" />,
      label: "Connected",
    },
    pending: {
      icon: <Clock className="text-amber-500" />,
      label: "Pending",
    },
    error: {
      icon: <XCircle className="text-destructive" />,
      label: "Error",
    },
  } as const

  const { icon, label } = map[status]

  return (
    <div className={cn("inline-flex items-center gap-2 text-sm font-medium", className)} data-status={status}>
      {icon}
      <span>{label}</span>
    </div>
  )
}

export function StripeConnectionStatusComponent() {
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
      const token = await user.getIdToken()
      console.log("✅ Got Firebase ID token, length:", token.length)
      return token
    } catch (error) {
      console.error("❌ Failed to get ID token:", error)
      return null
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
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {connectionStatus?.connected ? (
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
                  <AlertDescription>Your Stripe account requires additional setup to accept payments.</AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <p>Unable to check connection status</p>
          )}
        </CardContent>
      </Card>

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
    </div>
  )
}

export default StripeConnectionStatusComponent
