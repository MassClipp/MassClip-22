"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CreditCard, Globe, Shield, CheckCircle, ExternalLink } from 'lucide-react'

interface StripeConnectionDarkProps {
  userId: string
  onSuccess?: () => void
}

export function StripeConnectionDark({ userId, onSuccess }: StripeConnectionDarkProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateAccount = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/stripe/create-stripe-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create Stripe account")
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error("Error creating Stripe account:", err)
      setError(err instanceof Error ? err.message : "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  const handleConnectExisting = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/stripe/connect/oauth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect Stripe account")
      }

      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (err) {
      console.error("Error connecting Stripe account:", err)
      setError(err instanceof Error ? err.message : "Failed to connect account")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto py-8 md:py-16 px-4 max-w-6xl">
        {/* Subtitle only - no main heading */}
        <div className="text-center mb-8 md:mb-12">
          <p className="text-lg md:text-xl text-gray-400">Start accepting payments and track your earnings</p>
        </div>

        {/* Benefits Grid - mobile optimized */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-16">
          <div className="text-center">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
              <CreditCard className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold mb-2 text-white">Accept Payments</h3>
            <p className="text-sm md:text-base text-gray-400">Process payments from customers worldwide securely</p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
              <Globe className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold mb-2 text-white">Global Reach</h3>
            <p className="text-sm md:text-base text-gray-400">Supported in 40+ countries with local payment methods</p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
              <Shield className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold mb-2 text-white">Secure & Reliable</h3>
            <p className="text-sm md:text-base text-gray-400">Bank-level security with PCI compliance</p>
          </div>
        </div>

        {/* Connection Options - mobile optimized */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
          {/* Create New Account */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3 md:pb-4">
              <div className="flex items-center gap-3 mb-2">
                <CreditCard className="h-5 w-5 md:h-6 md:w-6 text-blue-400" />
                <CardTitle className="text-lg md:text-xl text-white">Create New Account</CardTitle>
              </div>
              <CardDescription className="text-sm md:text-base text-gray-400">
                Set up a new Stripe account to start accepting payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-300">Quick 5-minute setup</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-300">2.9% + 30¢ per transaction</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-300">Automatic payouts</span>
                </div>
              </div>
              
              <Button 
                onClick={handleCreateAccount} 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                    Create Account
                  </>
                )}
              </Button>
              
              <p className="text-xs md:text-sm text-gray-500 text-center">
                Redirects to Stripe for setup
              </p>
            </CardContent>
          </Card>

          {/* Connect Existing Account */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3 md:pb-4">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-5 w-5 md:h-6 md:w-6 text-green-400" />
                <CardTitle className="text-lg md:text-xl text-white">Have Stripe Account?</CardTitle>
              </div>
              <CardDescription className="text-sm md:text-base text-gray-400">
                Connect your existing Stripe account securely
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-300">Secure OAuth connection</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-300">No manual setup needed</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-300">Instant verification</span>
                </div>
              </div>
              
              <Button 
                onClick={handleConnectExisting} 
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                    Connect Account
                  </>
                )}
              </Button>
              
              <p className="text-xs md:text-sm text-gray-500 text-center">
                Stripe detects existing accounts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mt-6 md:mt-8 max-w-2xl mx-auto border-red-600 bg-red-900/20">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 text-red-400">
                <ExternalLink className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
                <span className="text-sm md:text-base">Error: {error}</span>
              </div>
              <Button 
                onClick={() => setError(null)} 
                variant="outline" 
                size="sm" 
                className="mt-3 md:mt-4 border-red-600 text-red-400 hover:bg-red-900/40"
              >
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
