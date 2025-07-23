"use client"

import { useState } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ExternalLink, CreditCard, Shield, Globe, CheckCircle, AlertCircle } from "lucide-react"

interface StripeConnectionPromptProps {
  onConnectionSuccess?: () => void
  existingStatus?: any
}

export default function StripeConnectionPrompt({ onConnectionSuccess, existingStatus }: StripeConnectionPromptProps) {
  const [user] = useAuthState(auth)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
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
      console.log("✅ Got Firebase ID token")
      return token
    } catch (error) {
      console.error("❌ Failed to get ID token:", error)
      return null
    }
  }

  // Connect existing Stripe account via OAuth
  const connectWithStripe = async () => {
    if (!user) {
      setMessage("Please log in to connect your Stripe account")
      setMessageType("error")
      return
    }

    setIsConnecting(true)
    setMessage("")
    setMessageType("")

    try {
      console.log("🔗 Starting Stripe Connect OAuth flow...")

      const token = await getIdToken()
      if (!token) {
        throw new Error("Failed to get authentication token")
      }

      const response = await fetch("/api/stripe/connect/oauth", {
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
      console.log("✅ OAuth URL created:", data)

      if (data.url) {
        // Redirect to Stripe OAuth
        window.location.href = data.url
      } else {
        throw new Error("No OAuth URL returned")
      }
    } catch (error) {
      console.error("❌ Error connecting with Stripe:", error)
      setMessage(`Error connecting: ${error instanceof Error ? error.message : "Unknown error"}`)
      setMessageType("error")
      setIsConnecting(false)
    }
  }

  // Create new Stripe account
  const createStripeAccount = async () => {
    if (!user) {
      setMessage("Please log in to create a Stripe account")
      setMessageType("error")
      return
    }

    setIsCreating(true)
    setMessage("")
    setMessageType("")

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
        // Redirect to Stripe onboarding
        window.location.href = data.url
      } else {
        throw new Error("No onboarding URL returned")
      }
    } catch (error) {
      console.error("❌ Error creating Stripe account:", error)
      setMessage(`Error creating account: ${error instanceof Error ? error.message : "Unknown error"}`)
      setMessageType("error")
      setIsCreating(false)
    }
  }

  // Show existing account status if available
  if (existingStatus?.accountId && existingStatus?.connected === false) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </div>
          <h1 className="text-3xl font-bold text-white">Complete Your Stripe Setup</h1>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Your Stripe account is connected but needs additional setup to accept payments
          </p>
        </div>

        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle className="text-white">Account Status</CardTitle>
            <CardDescription>Complete these steps to activate your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${existingStatus.capabilities?.details_submitted ? "bg-green-400" : "bg-red-400"}`}
                />
                <span className="text-sm text-zinc-300">Business Details</span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${existingStatus.capabilities?.charges_enabled ? "bg-green-400" : "bg-red-400"}`}
                />
                <span className="text-sm text-zinc-300">Accept Payments</span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${existingStatus.capabilities?.payouts_enabled ? "bg-green-400" : "bg-red-400"}`}
                />
                <span className="text-sm text-zinc-300">Receive Payouts</span>
              </div>
            </div>

            <Button onClick={() => (window.location.href = "/api/stripe/create-account-link")} className="w-full">
              Complete Stripe Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
          <CreditCard className="w-8 h-8 text-blue-500" />
        </div>
        <h1 className="text-3xl font-bold text-white">Connect Your Stripe Account</h1>
        <p className="text-zinc-400 max-w-2xl mx-auto">Start accepting payments and track your earnings</p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <CreditCard className="w-6 h-6 text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Accept Payments</h3>
          <p className="text-sm text-zinc-400">Process payments from customers worldwide</p>
        </div>
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
            <Globe className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Global Reach</h3>
          <p className="text-sm text-zinc-400">Supported in 40+ countries</p>
        </div>
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Secure & Reliable</h3>
          <p className="text-sm text-zinc-400">Bank-level security and encryption</p>
        </div>
      </div>

      {/* Connection Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create New Account */}
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <ExternalLink className="w-5 h-5 text-blue-400" />
              Create New Stripe Account
            </CardTitle>
            <CardDescription>Set up a new Stripe account to start accepting payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Quick 5-minute setup
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <CheckCircle className="w-4 h-4 text-green-400" />
                2.9% + 30¢ per transaction
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Automatic payouts to your bank
              </div>
            </div>

            <Button
              onClick={createStripeAccount}
              disabled={isCreating}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Create Stripe Account
                </>
              )}
            </Button>
            <p className="text-xs text-zinc-500 text-center">You'll be redirected to Stripe to complete setup</p>
          </CardContent>
        </Card>

        {/* Connect Existing Account */}
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Shield className="w-5 h-5 text-green-400" />
              Already Have a Stripe Account?
            </CardTitle>
            <CardDescription>Securely connect your existing Stripe account through Stripe Connect</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Secure OAuth connection
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <CheckCircle className="w-4 h-4 text-green-400" />
                No manual account IDs needed
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Stripe handles account verification
              </div>
            </div>

            <Button
              onClick={connectWithStripe}
              disabled={isConnecting}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Connect with Stripe
                </>
              )}
            </Button>
            <p className="text-xs text-zinc-500 text-center">
              Stripe will detect your existing account and connect it securely
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error/Success Messages */}
      {message && (
        <Alert
          className={`${messageType === "error" ? "border-red-500 bg-red-500/10" : "border-green-500 bg-green-500/10"}`}
        >
          {messageType === "error" ? (
            <AlertCircle className="h-4 w-4 text-red-400" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-400" />
          )}
          <AlertDescription className={messageType === "error" ? "text-red-300" : "text-green-300"}>
            {message}
          </AlertDescription>
        </Alert>
      )}

      {/* How It Works */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle className="text-white">How It Works</CardTitle>
          <CardDescription>Simple steps to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto text-blue-400 font-semibold">
                1
              </div>
              <h4 className="font-medium text-white">Connect Account</h4>
              <p className="text-sm text-zinc-400">Choose to create new or connect existing Stripe account</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto text-blue-400 font-semibold">
                2
              </div>
              <h4 className="font-medium text-white">Complete Setup</h4>
              <p className="text-sm text-zinc-400">Provide business details and verify your identity</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto text-blue-400 font-semibold">
                3
              </div>
              <h4 className="font-medium text-white">Start Earning</h4>
              <p className="text-sm text-zinc-400">Accept payments and track your earnings</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
