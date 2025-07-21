"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CreditCard, Globe, Shield, ExternalLink } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { useStripeConnectionCheck } from "@/hooks/use-stripe-connection-check"

export function StripeConnectionPrompt() {
  const { user } = useFirebaseAuth()
  const { isConnected, isLoading: statusLoading, refetch } = useStripeConnectionCheck()
  const [accountId, setAccountId] = useState("")
  const [isLinking, setIsLinking] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleLinkExistingAccount = async () => {
    if (!user || !accountId.trim()) {
      setError("Please enter a valid Stripe account ID")
      return
    }

    if (!accountId.startsWith("acct_")) {
      setError('Stripe account ID must start with "acct_"')
      return
    }

    setIsLinking(true)
    setError("")
    setSuccess("")

    try {
      console.log("🔗 [StripeConnectionPrompt] Getting ID token...")
      const token = await user.getIdToken(true) // Force refresh
      console.log("🎫 [StripeConnectionPrompt] Token obtained, length:", token.length)

      console.log("🔗 [StripeConnectionPrompt] Calling link-account API...")
      const response = await fetch("/api/stripe/connect/link-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          stripeAccountId: accountId.trim(),
        }),
      })

      console.log("📡 [StripeConnectionPrompt] Response status:", response.status)
      const data = await response.json()
      console.log("📡 [StripeConnectionPrompt] Response data:", data)

      if (response.ok) {
        setSuccess("Stripe account linked successfully!")
        setAccountId("")
        refetch() // Refresh connection status
      } else {
        setError(data.error || `Failed to link account (${response.status})`)
        console.error("❌ [StripeConnectionPrompt] Link failed:", data)
      }
    } catch (error: any) {
      console.error("❌ [StripeConnectionPrompt] Link error:", error)
      setError(`Error linking account: ${error.message}`)
    } finally {
      setIsLinking(false)
    }
  }

  const handleCreateNewAccount = async () => {
    if (!user) {
      setError("User not authenticated")
      return
    }

    setIsCreating(true)
    setError("")
    setSuccess("")

    try {
      console.log("🆕 [StripeConnectionPrompt] Getting ID token...")
      const token = await user.getIdToken(true) // Force refresh
      console.log("🎫 [StripeConnectionPrompt] Token obtained, length:", token.length)

      console.log("🆕 [StripeConnectionPrompt] Calling onboard API...")
      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      console.log("📡 [StripeConnectionPrompt] Response status:", response.status)
      const data = await response.json()
      console.log("📡 [StripeConnectionPrompt] Response data:", data)

      if (response.ok && data.url) {
        console.log("🔗 [StripeConnectionPrompt] Redirecting to:", data.url)
        window.location.href = data.url
      } else {
        setError(data.error || `Failed to create account (${response.status})`)
        console.error("❌ [StripeConnectionPrompt] Create failed:", data)
      }
    } catch (error: any) {
      console.error("❌ [StripeConnectionPrompt] Create error:", error)
      setError(`Error creating account: ${error.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Checking Stripe connection...</span>
        </CardContent>
      </Card>
    )
  }

  if (isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">✅ Stripe Account Connected</CardTitle>
          <CardDescription>Your Stripe account is connected and ready to accept payments</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <CreditCard className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Connect Your Stripe Account</CardTitle>
          <CardDescription>Start accepting payments and track your earnings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Accept Payments</h3>
              <p className="text-sm text-muted-foreground">Process payments from customers worldwide</p>
            </div>
            <div className="text-center p-4">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <Globe className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Global Reach</h3>
              <p className="text-sm text-muted-foreground">Supported in 40+ countries</p>
            </div>
            <div className="text-center p-4">
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Secure & Reliable</h3>
              <p className="text-sm text-muted-foreground">Bank-level security and encryption</p>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Create New Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Create New Stripe Account
          </CardTitle>
          <CardDescription>Set up a new Stripe account to start accepting payments</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCreateNewAccount} disabled={isCreating || !user} className="w-full">
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Create New Stripe Account
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Link Existing Account */}
      <Card>
        <CardHeader>
          <CardTitle>Link Existing Stripe Account</CardTitle>
          <CardDescription>Already have a Stripe account? Enter your account ID to link it</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accountId">Stripe Account ID</Label>
            <Input
              id="accountId"
              placeholder="acct_1234567890"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={isLinking}
            />
            <p className="text-xs text-muted-foreground">
              Find your account ID in your Stripe dashboard under Settings → Account details
            </p>
          </div>
          <Button
            onClick={handleLinkExistingAccount}
            disabled={isLinking || !accountId.trim() || !user}
            className="w-full"
          >
            {isLinking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Linking Account...
              </>
            ) : (
              "Link Existing Account"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
