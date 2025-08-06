"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Globe, Shield, Check, ExternalLink, Loader2, DollarSign, Zap, Lock } from 'lucide-react'
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"

export function StripeConnectOnboarding() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [connectingExisting, setConnectingExisting] = useState(false)

  const handleCreateNewAccount = async () => {
    if (!user) return

    setLoading(true)
    try {
      const response = await fetch("/api/stripe/connect/create-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to create Stripe account")
      }

      const data = await response.json()
      
      if (data.onboardingUrl) {
        // Redirect to Stripe onboarding
        window.location.href = data.onboardingUrl
      } else {
        throw new Error("No onboarding URL received")
      }
    } catch (error) {
      console.error("Error creating Stripe account:", error)
      toast({
        title: "Error",
        description: "Failed to create Stripe account. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConnectExisting = async () => {
    if (!user) return

    setConnectingExisting(true)
    try {
      const response = await fetch("/api/stripe/connect/oauth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to initiate Stripe connection")
      }

      const data = await response.json()
      
      if (data.oauthUrl) {
        // Redirect to Stripe OAuth
        window.location.href = data.oauthUrl
      } else {
        throw new Error("No OAuth URL received")
      }
    } catch (error) {
      console.error("Error connecting existing Stripe account:", error)
      toast({
        title: "Error",
        description: "Failed to connect existing Stripe account. Please try again.",
        variant: "destructive",
      })
    } finally {
      setConnectingExisting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CreditCard className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Connect Your Stripe Account</h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Start accepting payments and track your earnings
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Accept Payments</h3>
            <p className="text-zinc-400">Process payments from customers worldwide</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Global Reach</h3>
            <p className="text-zinc-400">Supported in 40+ countries</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Secure & Reliable</h3>
            <p className="text-zinc-400">Bank-level security and encryption</p>
          </div>
        </div>

        {/* Connection Options */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Create New Account */}
          <Card className="bg-zinc-800/50 border-zinc-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-white">Create New Stripe Account</CardTitle>
              </div>
              <CardDescription className="text-zinc-400">
                Set up a new Stripe account to start accepting payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-zinc-300">Quick 5-minute setup</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-zinc-300">2.9% + 30¢ per transaction</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-zinc-300">Automatic payouts to your bank</span>
                </div>
              </div>
              
              <Button 
                onClick={handleCreateNewAccount}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Create Stripe Account
                  </>
                )}
              </Button>
              
              <p className="text-xs text-zinc-500 text-center">
                You'll be redirected to Stripe to complete setup
              </p>
            </CardContent>
          </Card>

          {/* Connect Existing Account */}
          <Card className="bg-zinc-800/50 border-zinc-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-600"></div>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <Lock className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-white">Already Have a Stripe Account?</CardTitle>
              </div>
              <CardDescription className="text-zinc-400">
                Securely connect your existing Stripe account through Stripe Connect
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-zinc-300">Secure OAuth connection</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-zinc-300">No manual account IDs needed</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-zinc-300">Stripe handles account verification</span>
                </div>
              </div>
              
              <Button 
                onClick={handleConnectExisting}
                disabled={connectingExisting}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {connectingExisting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
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

        {/* How It Works */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">How It Works</h2>
            <p className="text-zinc-400">Simple steps to get started</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Connect Account</h3>
              <p className="text-zinc-400 text-sm">
                Choose to create new or connect existing Stripe account
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Complete Setup</h3>
              <p className="text-zinc-400 text-sm">
                Provide business details and verify your identity
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Start Earning</h3>
              <p className="text-zinc-400 text-sm">
                Accept payments and track earnings in your dashboard
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
