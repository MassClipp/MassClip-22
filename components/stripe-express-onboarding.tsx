"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, CreditCard, Globe, Shield, DollarSign, CheckCircle2, ExternalLink, Link } from "lucide-react"

interface OnboardingStatus {
  connected: boolean
  accountId?: string
  onboardingRequired: boolean
  account?: {
    id: string
    type: string
    country: string
    email?: string
    details_submitted: boolean
    charges_enabled: boolean
    payouts_enabled: boolean
    requirements?: any
  }
}

export default function StripeExpressOnboarding() {
  const { user } = useAuth()
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [accountIdInput, setAccountIdInput] = useState("")

  // Get Firebase ID token
  const getIdToken = async () => {
    if (!user) return null
    try {
      return await user.getIdToken()
    } catch (error) {
      console.error("Failed to get ID token:", error)
      return null
    }
  }

  // Check onboarding status
  const checkOnboardingStatus = async () => {
    if (!user) return

    setIsLoading(true)

    try {
      const token = await getIdToken()
      if (!token) throw new Error("Failed to get authentication token")

      const response = await fetch("/api/stripe/connect/onboarding-status", {
        method: "GET",
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
      setStatus(data)
      console.log("Onboarding status:", data)
    } catch (error) {
      console.error("Error checking onboarding status:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Create Express account and start onboarding
  const createStripeAccount = async () => {
    if (!user) return

    setIsCreating(true)

    try {
      const token = await getIdToken()
      if (!token) throw new Error("Failed to get authentication token")

      console.log("Creating Express account...")

      const response = await fetch("/api/stripe/connect/create-express-account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country: "US",
          businessType: "individual",
          email: user.email,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("Express account created:", data)

      if (data.alreadyConnected) {
        await checkOnboardingStatus() // Refresh status
      } else if (data.onboardingUrl) {
        // Redirect to Stripe onboarding
        window.location.href = data.onboardingUrl
      }
    } catch (error) {
      console.error("Error creating Express account:", error)
    } finally {
      setIsCreating(false)
    }
  }

  // Link existing account
  const linkExistingAccount = async () => {
    if (!user || !accountIdInput.trim()) return

    setIsLinking(true)

    try {
      const token = await getIdToken()
      if (!token) throw new Error("Failed to get authentication token")

      const response = await fetch("/api/stripe/connect/link-account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stripeAccountId: accountIdInput.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("Account linked:", data)

      // Refresh status to show updated connection
      await checkOnboardingStatus()
    } catch (error) {
      console.error("Error linking account:", error)
    } finally {
      setIsLinking(false)
    }
  }

  // Check status on component mount and when user changes
  useEffect(() => {
    if (user) {
      checkOnboardingStatus()
    }
  }, [user])

  if (!user) {
    return null
  }

  // Show connected state
  if (status?.connected) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-4xl w-full space-y-8">
          {/* Success Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Stripe Account Connected</h1>
              <p className="text-lg text-gray-400">Your account is ready to accept payments</p>
            </div>
          </div>

          {/* Account Details Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Account Status</h3>
                  <p className="text-gray-400">All systems operational</p>
                </div>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Connected</Badge>
            </div>

            {status.account && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Account Verification</span>
                    <Badge
                      variant={status.account.details_submitted ? "default" : "secondary"}
                      className={
                        status.account.details_submitted
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                      }
                    >
                      {status.account.details_submitted ? "Verified" : "Pending"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Payment Processing</span>
                    <Badge
                      variant={status.account.charges_enabled ? "default" : "secondary"}
                      className={
                        status.account.charges_enabled
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                      }
                    >
                      {status.account.charges_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Payout System</span>
                    <Badge
                      variant={status.account.payouts_enabled ? "default" : "secondary"}
                      className={
                        status.account.payouts_enabled
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                      }
                    >
                      {status.account.payouts_enabled ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Region</span>
                    <span className="text-gray-300">{status.account.country}</span>
                  </div>
                </div>
              </div>
            )}

            {status.accountId && (
              <div className="mt-6 p-4 bg-zinc-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <div>
                    <h4 className="font-medium text-white mb-1">Account ID</h4>
                    <code className="text-sm text-gray-300 bg-zinc-700 px-2 py-1 rounded font-mono">
                      {status.accountId}
                    </code>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Show onboarding flow
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mb-4">
            <CreditCard className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Connect Your Stripe Account</h1>
            <p className="text-lg text-gray-400">Start accepting payments and track your earnings</p>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Accept Payments</h3>
            <p className="text-sm text-gray-400">Process payments from customers worldwide</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Globe className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Global Reach</h3>
            <p className="text-sm text-gray-400">Supported in 40+ countries</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Secure & Reliable</h3>
            <p className="text-sm text-gray-400">Bank-level security and encryption</p>
          </div>
        </div>

        {/* Main Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create New Account */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <CreditCard className="w-6 h-6 text-blue-400" />
              <div>
                <h3 className="text-xl font-semibold text-white">Create New Stripe Account</h3>
                <p className="text-gray-400">Set up a new Stripe account to start accepting payments</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-gray-300">Quick 5-minute setup</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-gray-300">2.9% + 30¢ per transaction</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-gray-300">Automatic payouts to your bank</span>
              </div>
            </div>

            <Button
              onClick={createStripeAccount}
              disabled={isCreating || isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Stripe Account
                  <ExternalLink className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center mt-3">
              After creating your account, return here to link it
            </p>
          </div>

          {/* Link Existing Account */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Link className="w-6 h-6 text-green-400" />
              <div>
                <h3 className="text-xl font-semibold text-white">Link Existing Account</h3>
                <p className="text-gray-400">Connect your existing Stripe account</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Stripe Account ID</label>
                <Input
                  type="text"
                  placeholder="acct_1234567890"
                  value={accountIdInput}
                  onChange={(e) => setAccountIdInput(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">Find this in your Stripe Dashboard → Settings → Account</p>
              </div>
            </div>

            <Button
              onClick={linkExistingAccount}
              disabled={isLinking || isLoading || !accountIdInput.trim()}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
            >
              {isLinking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Linking Account...
                </>
              ) : (
                <>
                  <Link className="w-4 h-4 mr-2" />
                  Link Account
                </>
              )}
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
            <p className="text-gray-400">Checking account status...</p>
          </div>
        )}
      </div>
    </div>
  )
}
