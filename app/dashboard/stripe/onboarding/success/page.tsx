"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, AlertTriangle, ArrowRight } from "lucide-react"

export default function OnboardingSuccessPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isVerifying, setIsVerifying] = useState(true)
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean
    message: string
    accountConnected?: boolean
  } | null>(null)

  const accountId = searchParams.get("account")

  // Verify onboarding completion
  const verifyOnboarding = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()

      const response = await fetch("/api/stripe/connect/onboarding-status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()

        if (data.connected) {
          setVerificationResult({
            success: true,
            message: "Your Stripe account has been successfully connected and is ready to accept payments!",
            accountConnected: true,
          })
        } else {
          setVerificationResult({
            success: false,
            message: "Your account setup is still processing. This can take a few minutes to complete.",
            accountConnected: false,
          })
        }
      } else {
        setVerificationResult({
          success: false,
          message: "We're having trouble verifying your account status. Please try again in a moment.",
          accountConnected: false,
        })
      }
    } catch (error) {
      console.error("Error verifying onboarding:", error)
      setVerificationResult({
        success: false,
        message: "An error occurred while verifying your account. Our team has been notified.",
        accountConnected: false,
      })
    } finally {
      setIsVerifying(false)
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      // Wait a moment for Stripe to process, then verify
      const timer = setTimeout(() => {
        verifyOnboarding()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [user, loading, router])

  const handleContinue = () => {
    router.push("/dashboard/earnings")
  }

  const handleRetry = () => {
    setIsVerifying(true)
    verifyOnboarding()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  isVerifying ? "bg-blue-100" : verificationResult?.success ? "bg-emerald-100" : "bg-amber-100"
                }`}
              >
                {isVerifying ? (
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                ) : verificationResult?.success ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-amber-600" />
                )}
              </div>
              <CardTitle className="text-2xl text-gray-900">
                {isVerifying
                  ? "Verifying Your Account"
                  : verificationResult?.success
                    ? "Setup Complete!"
                    : "Almost There"}
              </CardTitle>
              <CardDescription className="text-base text-gray-600">
                {isVerifying
                  ? "Please wait while we confirm your Stripe account setup..."
                  : verificationResult?.success
                    ? "Your payment account is ready to start earning"
                    : "Your account setup is being processed"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {accountId && (
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 mb-1">Account ID</p>
                  <code className="text-sm font-mono text-gray-800 bg-white px-2 py-1 rounded border">{accountId}</code>
                </div>
              )}

              {!isVerifying && verificationResult && (
                <div
                  className={`rounded-lg p-4 ${
                    verificationResult.success
                      ? "bg-emerald-50 border border-emerald-200"
                      : "bg-amber-50 border border-amber-200"
                  }`}
                >
                  <p className={`text-sm ${verificationResult.success ? "text-emerald-800" : "text-amber-800"}`}>
                    {verificationResult.message}
                  </p>
                </div>
              )}

              {verificationResult?.success && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">What's next?</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Start uploading and selling your content</li>
                      <li>• Receive automatic payouts to your bank account</li>
                      <li>• Track your earnings in real-time</li>
                      <li>• Access detailed analytics and reports</li>
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {isVerifying ? (
                  <Button disabled className="flex-1">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </Button>
                ) : verificationResult?.success ? (
                  <Button onClick={handleContinue} className="flex-1 bg-blue-600 hover:bg-blue-700">
                    Continue to Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleRetry} variant="outline" className="flex-1 bg-transparent">
                      Check Again
                    </Button>
                    <Button onClick={handleContinue} className="flex-1 bg-blue-600 hover:bg-blue-700">
                      Continue Anyway
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
