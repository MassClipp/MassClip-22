"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, CreditCard, Globe, Shield, CheckCircle, ExternalLink } from 'lucide-react'
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

export default function ConnectStripePage() {
  const { user } = useFirebaseAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateAccount = async () => {
    if (!user?.uid) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/stripe/create-stripe-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid }),
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
    if (!user?.uid) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/stripe/connect/oauth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid }),
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
      <div className="container mx-auto py-16 px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Connect Your Stripe Account</h1>
          <p className="text-xl text-gray-400">Start accepting payments and track your earnings</p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/25">
              <span className="text-2xl font-bold text-white">$</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Accept Payments</h3>
            <p className="text-gray-400">Process payments from customers worldwide securely</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
              <Globe className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Global Reach</h3>
            <p className="text-gray-400">Supported in 40+ countries with local payment methods</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/25">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure & Reliable</h3>
            <p className="text-gray-400">Bank-level security with PCI compliance</p>
          </div>
        </div>

        {/* Connection Options */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Create New Account */}
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700/50 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <CreditCard className="h-6 w-6 text-blue-400" />
                <CardTitle className="text-xl text-white">Create New Stripe Account</CardTitle>
              </div>
              <CardDescription className="text-gray-400">
                Set up a new Stripe account to start accepting payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-300">Quick 5-minute setup</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-300">2.9% + 30¢ per transaction</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-300">Automatic payouts to your bank</span>
                </div>
              </div>
              
              <Button 
                onClick={handleCreateAccount} 
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-5 w-5" />
                    Create Stripe Account
                  </>
                )}
              </Button>
              
              <p className="text-sm text-gray-500 text-center">
                You'll be redirected to Stripe to complete setup
              </p>
            </CardContent>
          </Card>

          {/* Connect Existing Account */}
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700/50 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-green-500 rounded flex items-center justify-center">
                  <ExternalLink className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-xl text-white">Already Have a Stripe Account?</CardTitle>
              </div>
              <CardDescription className="text-gray-400">
                Securely connect your existing Stripe account through Stripe Connect
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-300">Secure OAuth connection</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-300">No manual account IDs needed</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-300">Stripe handles account verification</span>
                </div>
              </div>
              
              <Button 
                onClick={handleConnectExisting} 
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg"
                size="lg"
              >
                {loading ? (
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
              
              <p className="text-sm text-gray-500 text-center">
                Stripe will detect your existing account and connect it securely
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mt-8 max-w-2xl mx-auto border-red-600 bg-red-900/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-red-400">
                <ExternalLink className="h-5 w-5" />
                <span>Error: {error}</span>
              </div>
              <Button 
                onClick={() => setError(null)} 
                variant="outline" 
                size="sm" 
                className="mt-4 border-red-600 text-red-400 hover:bg-red-900/40"
              >
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}

        {/* How It Works Section */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-8 flex items-center justify-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/25">
              <span className="text-sm font-bold">?</span>
            </div>
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold shadow-lg shadow-blue-500/25">
                1
              </div>
              <h3 className="text-lg font-semibold mb-2">Choose Your Option</h3>
              <p className="text-gray-400">Create a new account or connect an existing one</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold shadow-lg shadow-blue-500/25">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2">Complete Setup</h3>
              <p className="text-gray-400">Follow Stripe's secure onboarding process</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold shadow-lg shadow-blue-500/25">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2">Start Earning</h3>
              <p className="text-gray-400">Begin accepting payments and tracking earnings</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
