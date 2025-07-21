"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CreditCard, Globe, Shield, ExternalLink, CheckCircle, Link } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface StripeConnectionPromptProps {
  onConnectionSuccess?: () => void
}

export default function StripeConnectionPrompt({ onConnectionSuccess }: StripeConnectionPromptProps) {
  const { user } = useFirebaseAuth()
  const [accountId, setAccountId] = useState("")
  const [isLinking, setIsLinking] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

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

      console.log("🆕 [StripeConnectionPrompt] Calling create-express-account API...")
      const response = await fetch("/api/stripe/connect/create-express-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          country: "US",
          businessType: "individual",
          email: user.email,
        }),
      })

      console.log("📡 [StripeConnectionPrompt] Response status:", response.status)
      const data = await response.json()
      console.log("📡 [StripeConnectionPrompt] Response data:", data)

      if (response.ok) {
        if (data.alreadyConnected) {
          setSuccess("Stripe account already connected!")
          onConnectionSuccess?.()
        } else if (data.onboardingUrl) {
          console.log("🔗 [StripeConnectionPrompt] Redirecting to:", data.onboardingUrl)
          window.location.href = data.onboardingUrl
        }
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
        onConnectionSuccess?.()
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

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-6">
            <CreditCard className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Connect Your Stripe Account</h1>
          <p className="text-gray-400 text-lg">Start accepting payments and track your earnings</p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mb-4">
                <span className="text-white text-xl font-bold">$</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Accept Payments</h3>
              <p className="text-gray-400">Process payments from customers worldwide</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Global Reach</h3>
              <p className="text-gray-400">Supported in 40+ countries</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Secure & Reliable</h3>
              <p className="text-gray-400">Bank-level security and encryption</p>
            </CardContent>
          </Card>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-950 mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-400">{success}</AlertDescription>
          </Alert>
        )}

        {/* Main Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create New Account */}
          <Card className="bg-blue-950 border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CreditCard className="h-5 w-5" />
                Create New Stripe Account
              </CardTitle>
              <CardDescription className="text-blue-200">
                Set up a new Stripe account to start accepting payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-blue-200">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Quick 5-minute setup</span>
                </div>
                <div className="flex items-center gap-2 text-blue-200">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">2.9% + 30¢ per transaction</span>
                </div>
                <div className="flex items-center gap-2 text-blue-200">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Automatic payouts to your bank</span>
                </div>
              </div>

              <Button
                onClick={handleCreateNewAccount}
                disabled={isCreating || !user}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Stripe Account
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-xs text-blue-300 text-center">After creating your account, return here to link it</p>
            </CardContent>
          </Card>

          {/* Link Existing Account */}
          <Card className="bg-green-950 border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Link className="h-5 w-5" />
                Link Existing Account
              </CardTitle>
              <CardDescription className="text-green-200">Connect your existing Stripe account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accountId" className="text-green-200">
                  Stripe Account ID
                </Label>
                <Input
                  id="accountId"
                  placeholder="acct_1234567890"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  disabled={isLinking}
                  className="bg-green-900 border-green-700 text-white placeholder:text-green-400"
                />
                <p className="text-xs text-green-300">Find this in your Stripe Dashboard → Settings → Account</p>
              </div>

              <Button
                onClick={handleLinkExistingAccount}
                disabled={isLinking || !accountId.trim() || !user}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
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
        </div>
      </div>
    </div>
  )
}
