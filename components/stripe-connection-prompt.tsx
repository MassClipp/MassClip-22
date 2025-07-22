"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, ExternalLink, AlertCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-firebase-auth"
import { toast } from "sonner"

interface StripeConnectionPromptProps {
  onConnectionStart?: () => void
  onConnectionComplete?: () => void
}

export function StripeConnectionPrompt({ onConnectionStart, onConnectionComplete }: StripeConnectionPromptProps) {
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [isConnectingAccount, setIsConnectingAccount] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const handleCreateAccount = async () => {
    if (!user) {
      toast.error("Please log in to continue")
      return
    }

    setIsCreatingAccount(true)
    setError(null)
    onConnectionStart?.()

    try {
      const idToken = await user.getIdToken()

      const response = await fetch("/api/stripe/create-stripe-account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create Stripe account")
      }

      if (data.url) {
        console.log("🔧 Redirecting to Stripe onboarding:", data.url)
        window.location.href = data.url
      } else {
        throw new Error("No onboarding URL received")
      }
    } catch (error) {
      console.error("❌ Failed to create Stripe account:", error)
      setError(error instanceof Error ? error.message : "Failed to create Stripe account")
      toast.error("Failed to create Stripe account. Please try again.")
    } finally {
      setIsCreatingAccount(false)
    }
  }

  const handleConnectExisting = async () => {
    if (!user) {
      toast.error("Please log in to continue")
      return
    }

    setIsConnectingAccount(true)
    setError(null)
    onConnectionStart?.()

    try {
      const idToken = await user.getIdToken()

      const response = await fetch("/api/stripe/connect-existing-account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect existing Stripe account")
      }

      if (data.url) {
        console.log("🔧 Redirecting to Stripe OAuth:", data.url)
        window.location.href = data.url
      } else {
        throw new Error("No OAuth URL received")
      }
    } catch (error) {
      console.error("❌ Failed to connect existing account:", error)
      setError(error instanceof Error ? error.message : "Failed to connect existing account")
      toast.error("Failed to connect existing account. Please try again.")
    } finally {
      setIsConnectingAccount(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Create New Account */}
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-blue-900">Create New Stripe Account</CardTitle>
            </div>
            <CardDescription className="text-blue-700">
              Set up a new Stripe account to start accepting payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <CheckCircle className="h-4 w-4" />
                <span>Quick 5-minute setup</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <CheckCircle className="h-4 w-4" />
                <span>2.9% + 30¢ per transaction</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <CheckCircle className="h-4 w-4" />
                <span>Automatic payouts to your bank</span>
              </div>
            </div>
            <Button
              onClick={handleCreateAccount}
              disabled={isCreatingAccount || isConnectingAccount}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isCreatingAccount ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating Account...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Create Stripe Account
                </>
              )}
            </Button>
            <p className="text-xs text-blue-600 text-center">You'll be redirected to Stripe to complete setup</p>
          </CardContent>
        </Card>

        {/* Connect Existing Account */}
        <Card className="border-2 border-green-200 bg-green-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
                <ExternalLink className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-green-900">Already Have a Stripe Account?</CardTitle>
            </div>
            <CardDescription className="text-green-700">
              Securely connect your existing Stripe account through Stripe Connect
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span>Secure OAuth connection</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span>No manual account IDs needed</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span>Stripe handles account verification</span>
              </div>
            </div>
            <Button
              onClick={handleConnectExisting}
              disabled={isCreatingAccount || isConnectingAccount}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isConnectingAccount ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect with Stripe
                </>
              )}
            </Button>
            <p className="text-xs text-green-600 text-center">
              Stripe will detect your existing account and connect it securely
            </p>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-gray-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">?</span>
            </div>
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 text-sm font-bold">1</span>
            </div>
            <div>
              <p className="font-medium">Choose Your Path</p>
              <p className="text-sm text-gray-600">Create a new account or connect an existing one</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 text-sm font-bold">2</span>
            </div>
            <div>
              <p className="font-medium">Complete Stripe Setup</p>
              <p className="text-sm text-gray-600">Provide business details and verify your identity</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 text-sm font-bold">3</span>
            </div>
            <div>
              <p className="font-medium">Start Earning</p>
              <p className="text-sm text-gray-600">Begin accepting payments and track your earnings</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
