"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { CreditCard, Globe, Shield, CheckCircle, ExternalLink, Loader2, AlertTriangle, Info } from "lucide-react"

interface StripeConnectionPromptProps {
  onConnectionSuccess?: () => void
  existingStatus?: any
}

export default function StripeConnectionPrompt({ onConnectionSuccess, existingStatus }: StripeConnectionPromptProps) {
  const { user } = useAuth()
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    if (!user) return

    try {
      setIsConnecting(true)
      setError(null)

      const idToken = await user.getIdToken()

      // Start the OAuth connection process
      const response = await fetch("/api/stripe/connect/oauth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to start Stripe Connect process")
      }

      const data = await response.json()

      if (data.success && data.oauthUrl) {
        console.log(`🔗 [Connection Prompt] Redirecting to OAuth flow: ${data.oauthUrl}`)
        // Redirect to Stripe's OAuth authorization page
        window.location.href = data.oauthUrl
      } else {
        throw new Error("Failed to generate OAuth URL")
      }
    } catch (error: any) {
      console.error("Error connecting to Stripe:", error)
      setError(error.message)
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Connect Your Stripe Account</h1>
          <p className="text-zinc-400 text-lg">Start accepting payments and track your earnings</p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-green-600/20 rounded-full flex items-center justify-center mx-auto">
              <CreditCard className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Accept Payments</h3>
            <p className="text-zinc-400 text-sm">Process payments from customers worldwide</p>
          </div>

          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto">
              <Globe className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Global Reach</h3>
            <p className="text-zinc-400 text-sm">Supported in 40+ countries</p>
          </div>

          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Secure & Reliable</h3>
            <p className="text-zinc-400 text-sm">Bank-level security and encryption</p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="border-red-800 bg-red-900/20">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">Failed to start onboarding process: {error}</AlertDescription>
          </Alert>
        )}

        {/* Main Connection Card */}
        <Card className="bg-blue-600/10 border-blue-600/30 max-w-2xl mx-auto">
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-xl text-white">Connect with Stripe</CardTitle>
            <CardDescription className="text-zinc-300">
              Securely connect your Stripe account through Stripe Connect
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Features List */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-zinc-300">Secure OAuth connection</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-zinc-300">Quick 5-minute setup</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-zinc-300">2.9% + 30¢ per transaction</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-zinc-300">Automatic payouts to your bank</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-zinc-300">Stripe handles account verification</span>
              </div>
            </div>

            {/* Connect Button */}
            <Button
              onClick={handleConnect}
              disabled={isConnecting || !user}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-5 w-5" />
                  Connect with Stripe
                </>
              )}
            </Button>

            <p className="text-center text-sm text-zinc-400">You'll be redirected to Stripe to complete setup</p>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="bg-zinc-900/60 border-zinc-800/50 max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-400" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="text-white font-medium">Connect Your Account</p>
                  <p className="text-zinc-400 text-sm">
                    Securely link your existing Stripe account or create a new one
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="text-white font-medium">Complete Verification</p>
                  <p className="text-zinc-400 text-sm">
                    Stripe will guide you through identity and business verification
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="text-white font-medium">Start Earning</p>
                  <p className="text-zinc-400 text-sm">Begin accepting payments and track your earnings</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
