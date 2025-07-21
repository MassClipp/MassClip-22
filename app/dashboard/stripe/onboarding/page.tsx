"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, RefreshCw } from "lucide-react"

export default function StripeOnboardingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isRefresh = searchParams.get("refresh") === "true"

  useEffect(() => {
    // If user is not authenticated, redirect to login
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  const handleReturnToEarnings = () => {
    router.push("/dashboard/earnings")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">
                {isRefresh ? "Continue Your Setup" : "Stripe Account Setup"}
              </CardTitle>
              <CardDescription className="text-base text-gray-600">
                {isRefresh
                  ? "Your onboarding session has expired. Let's get you back on track."
                  : "You'll be redirected to Stripe to complete your account verification."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isRefresh ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-amber-800 text-sm">
                    <strong>Session Expired:</strong> Don't worry, your progress has been saved. Click below to continue
                    where you left off.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• You'll be securely redirected to Stripe</li>
                      <li>• Complete identity verification (2-3 minutes)</li>
                      <li>• Add your bank account details</li>
                      <li>• Return here to start earning</li>
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleReturnToEarnings} variant="outline" className="flex-1 bg-transparent">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
