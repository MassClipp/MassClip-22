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
        {/* Subtitle */}
        <div className="text-center mb-8 md:mb-12">
          <p className="text-lg md:text-xl text-gray-400">Start accepting payments and track your earnings</p>
        </div>

        {/* Benefits Grid - Stack vertically on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 md:mb-16">
          <div className="text-center">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CreditCard className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">Accept Payments</h3>
            <p className="text-sm text-gray-400">Process payments securely worldwide</p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Globe className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">Global Reach</h3>
            <p className="text-sm text-gray-400">40+ countries supported</p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">Secure & Reliable</h3>
            <p className="text-sm text-gray-400">Bank-level security</p>
          </div>
        </div>

        {/* Connection Options - Single column on mobile */}
        <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-2 md:gap-8 max-w-4xl mx-auto">
          {/* Create New Account */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <CreditCard className="h-5 w-5 text-blue-400" />
                <CardTitle className="text-lg text-white">Create New Account</CardTitle>
              </div>
              <CardDescription className="text-sm text-gray-400">
                Set up a new Stripe account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">5-minute setup</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">2.9% + 30¢ per transaction</span>
                </div>
              </div>
              
              <Button 
                onClick={handleCreateAccount} 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Connect Existing Account */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-5 w-5 text-green-400" />
                <CardTitle className="text-lg text-white">Have Account?</CardTitle>
              </div>
              <CardDescription className="text-sm text-gray-400">
                Connect existing Stripe account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">Secure OAuth</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">Instant verification</span>
                </div>
              </div>
              
              <Button 
                onClick={handleConnectExisting} 
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Connect Account
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mt-6 max-w-2xl mx-auto border-red-600 bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-red-400">
                <ExternalLink className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">Error: {error}</span>
              </div>
              <Button 
                onClick={() => setError(null)} 
                variant="outline" 
                size="sm" 
                className="mt-3 border-red-600 text-red-400 hover:bg-red-900/40"
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
