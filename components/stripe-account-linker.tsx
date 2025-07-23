"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, AlertCircle, Link, Info } from "lucide-react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"

interface ConnectionStatus {
  connected: boolean
  accountId?: string
  status?: string
  requiresAction?: boolean
}

export function StripeAccountLinker() {
  const [user] = useAuthState(auth)
  const [accountId, setAccountId] = useState("")
  const [isLinking, setIsLinking] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ connected: false })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Check current connection status
  const checkConnectionStatus = async () => {
    if (!user) {
      console.log("❌ No user available for status check")
      setIsCheckingStatus(false)
      return
    }

    try {
      console.log("🔍 Checking connection status...")
      setIsCheckingStatus(true)
      setError("")

      // Get fresh token
      const token = await user.getIdToken(true)
      console.log("🔑 Got fresh token for status check")

      const response = await fetch("/api/stripe/connection-status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      console.log("📡 Status check response:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("❌ Status check failed:", errorData)
        throw new Error(errorData.error || "Failed to check connection status")
      }

      const data = await response.json()
      console.log("✅ Connection status:", data)

      setConnectionStatus(data)
      if (data.accountId) {
        setAccountId(data.accountId)
      }
    } catch (err) {
      console.error("❌ Error checking connection status:", err)
      setError(err instanceof Error ? err.message : "Failed to check connection status")
    } finally {
      setIsCheckingStatus(false)
    }
  }

  // Link account
  const handleLinkAccount = async () => {
    if (!user) {
      setError("Authentication required - please log in first")
      return
    }

    if (!accountId.trim()) {
      setError("Please enter a Stripe Account ID")
      return
    }

    try {
      console.log("🔗 Starting account linking process...")
      setIsLinking(true)
      setError("")
      setSuccess("")

      // Get fresh token
      const token = await user.getIdToken(true)
      console.log("🔑 Got fresh token for linking")

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
        console.error("❌ Account linking failed:", errorData)
        throw new Error(errorData.error || "Failed to link account")
      }

      const data = await response.json()
      console.log("✅ Account linked successfully:", data)

      setSuccess("Account linked successfully!")

      // Refresh connection status
      await checkConnectionStatus()
    } catch (err) {
      console.error("❌ Error linking account:", err)
      setError(err instanceof Error ? err.message : "Failed to link account")
    } finally {
      setIsLinking(false)
    }
  }

  // Check status on component mount and when user changes
  useEffect(() => {
    if (user) {
      checkConnectionStatus()
    } else {
      setIsCheckingStatus(false)
      setConnectionStatus({ connected: false })
    }
  }, [user])

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-600 text-white">Active</Badge>
      case "pending":
        return <Badge className="bg-yellow-600 text-white">Pending</Badge>
      case "restricted":
        return <Badge className="bg-red-600 text-white">Restricted</Badge>
      default:
        return <Badge variant="secondary">Not Connected</Badge>
    }
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Please log in to manage your Stripe account connection.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Connection Status
          </CardTitle>
          <CardDescription>Your current Stripe account connection status</CardDescription>
        </CardHeader>
        <CardContent>
          {isCheckingStatus ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking connection status...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Status:</span>
                {getStatusBadge(connectionStatus.status)}
              </div>

              {connectionStatus.accountId && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Account ID:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">{connectionStatus.accountId}</code>
                </div>
              )}

              {connectionStatus.connected && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Account successfully connected</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Account Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Link Existing Account
          </CardTitle>
          <CardDescription>Connect your existing Stripe account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="accountId" className="text-sm font-medium">
              Stripe Account ID
            </label>
            <Input
              id="accountId"
              placeholder="acct_1234567890"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={isLinking}
            />
            <p className="text-xs text-gray-500">Find this in your Stripe Dashboard → Settings → Account</p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleLinkAccount} disabled={isLinking || !accountId.trim()} className="w-full">
            {isLinking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Linking Account...
              </>
            ) : (
              <>
                <Link className="mr-2 h-4 w-4" />
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
            <Info className="h-5 w-5" />
            Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p>
              <strong>Creating a New Account</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>Click "Create Stripe Account" above</li>
              <li>Fill out your business information</li>
              <li>Verify your identity</li>
            </ol>
          </div>

          <div className="text-sm space-y-2">
            <p>
              <strong>Finding Your Account ID</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>Log into your Stripe Dashboard</li>
              <li>Go to Settings → Account</li>
              <li>Copy your Account ID (starts with "acct_")</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default StripeAccountLinker
