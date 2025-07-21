"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, CreditCard, Shield, CheckCircle2, ArrowRight, Sparkles, Building2 } from "lucide-react"

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
  const [isRefreshing, setIsRefreshing] = useState(false)

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
  const startOnboarding = async () => {
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

  // Refresh onboarding link
  const refreshOnboardingLink = async () => {
    if (!user) return

    setIsRefreshing(true)

    try {
      const token = await getIdToken()
      if (!token) throw new Error("Failed to get authentication token")

      const response = await fetch("/api/stripe/connect/refresh-onboarding-link", {
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
      console.log("Onboarding link refreshed:", data)

      if (data.onboardingUrl) {
        // Redirect to refreshed Stripe onboarding
        window.location.href = data.onboardingUrl
      }
    } catch (error) {
      console.error("Error refreshing onboarding link:", error)
    } finally {
      setIsRefreshing(false)
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
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Setup Complete</h1>
            <p className="text-lg text-gray-600">Your Stripe account is ready to accept payments</p>
          </div>
        </div>

        {/* Account Details Card */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">Account Status</CardTitle>
                  <CardDescription className="text-gray-600">All systems operational</CardDescription>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 px-3 py-1">Connected</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {status.account && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Account Verification</span>
                      <Badge
                        variant={status.account.details_submitted ? "default" : "secondary"}
                        className={
                          status.account.details_submitted ? "bg-emerald-100 text-emerald-800 border-emerald-200" : ""
                        }
                      >
                        {status.account.details_submitted ? "Verified" : "Pending"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Payment Processing</span>
                      <Badge
                        variant={status.account.charges_enabled ? "default" : "secondary"}
                        className={
                          status.account.charges_enabled ? "bg-emerald-100 text-emerald-800 border-emerald-200" : ""
                        }
                      >
                        {status.account.charges_enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Payout System</span>
                      <Badge
                        variant={status.account.payouts_enabled ? "default" : "secondary"}
                        className={
                          status.account.payouts_enabled ? "bg-emerald-100 text-emerald-800 border-emerald-200" : ""
                        }
                      >
                        {status.account.payouts_enabled ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Region</span>
                      <span className="text-sm text-gray-600 font-medium">{status.account.country}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Account ID</h4>
                      <code className="text-sm text-blue-700 bg-blue-100 px-2 py-1 rounded font-mono">
                        {status.accountId}
                      </code>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Accept Payments</h3>
              <p className="text-sm text-gray-600">Process credit cards and digital payments securely</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Automatic Payouts</h3>
              <p className="text-sm text-gray-600">Receive earnings directly to your bank account</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Enterprise Security</h3>
              <p className="text-sm text-gray-600">Bank-level security and fraud protection</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Show onboarding flow
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Welcome Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <CreditCard className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Stripe Connect</h1>
          <p className="text-lg text-gray-600">Set up your payment account to start earning from your content</p>
        </div>
      </div>

      {/* Main Setup Card */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl text-gray-900">Payment Account Setup</CardTitle>
          <CardDescription className="text-gray-600 text-base">
            {isLoading
              ? "Checking your account status..."
              : status?.accountId
                ? "Complete your account verification to start accepting payments"
                : "Create your secure payment account in just a few minutes"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600">Verifying your account status...</p>
            </div>
          ) : (
            <>
              {/* Setup Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-blue-600 font-semibold">1</span>
                  </div>
                  <h3 className="font-medium text-gray-900">Verify Identity</h3>
                  <p className="text-sm text-gray-600">Provide basic information to verify your identity</p>
                </div>

                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-blue-600 font-semibold">2</span>
                  </div>
                  <h3 className="font-medium text-gray-900">Add Bank Details</h3>
                  <p className="text-sm text-gray-600">Connect your bank account for automatic payouts</p>
                </div>

                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-blue-600 font-semibold">3</span>
                  </div>
                  <h3 className="font-medium text-gray-900">Start Earning</h3>
                  <p className="text-sm text-gray-600">Begin accepting payments from your audience</p>
                </div>
              </div>

              <Separator />

              {/* Action Button */}
              <div className="text-center space-y-4">
                {!status?.accountId ? (
                  <Button
                    onClick={startOnboarding}
                    disabled={isCreating}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-base font-medium"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Setting up your account...
                      </>
                    ) : (
                      <>
                        Get Started
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={refreshOnboardingLink}
                    disabled={isRefreshing}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-base font-medium"
                  >
                    {isRefreshing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Continue Setup
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                )}

                <p className="text-sm text-gray-500">Powered by Stripe • Bank-level security • Takes 2-3 minutes</p>
              </div>

              {/* Trust Indicators */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">256-bit SSL encryption</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">PCI DSS compliant</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <Building2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">Trusted by millions</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
