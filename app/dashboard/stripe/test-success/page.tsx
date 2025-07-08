"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, ArrowLeft, Loader2 } from "lucide-react"

export default function TestStripeSuccessPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isUpdating, setIsUpdating] = useState(true)

  useEffect(() => {
    if (user) {
      // Give Stripe a moment to process the onboarding completion
      const timer = setTimeout(() => {
        setIsUpdating(false)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [user])

  const goToDashboard = () => {
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-green-200 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            {isUpdating ? (
              <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
            ) : (
              <CheckCircle className="h-8 w-8 text-green-600" />
            )}
          </div>
          <CardTitle className="text-green-800">
            {isUpdating ? "Processing Setup..." : "Test Account Setup Complete!"}
          </CardTitle>
          <CardDescription className="text-green-700">
            {isUpdating
              ? "We're updating your test account status"
              : "Your test Stripe Connect account is now ready for testing"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isUpdating && (
            <>
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  You can now test end-to-end purchases with real webhook data in your preview environment.
                </AlertDescription>
              </Alert>

              <div className="space-y-2 text-sm text-green-700">
                <p>✅ Test account is active</p>
                <p>✅ Payments enabled</p>
                <p>✅ Payouts enabled</p>
                <p>✅ Ready for testing</p>
              </div>
            </>
          )}

          <Button
            onClick={goToDashboard}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            disabled={isUpdating}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {isUpdating ? "Please wait..." : "Return to Dashboard"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
