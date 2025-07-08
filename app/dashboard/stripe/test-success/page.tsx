"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, ArrowLeft } from "lucide-react"

export default function TestStripeSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      router.push("/dashboard")
    }, 5000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      <Card className="w-full max-w-md border-green-200 bg-white/80 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-green-800">Test Account Setup Complete!</CardTitle>
          <CardDescription className="text-green-700">
            Your test Stripe Connect account is now ready for testing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-green-600">
            You can now test end-to-end purchases with real webhook data in the preview environment.
          </p>

          <div className="space-y-2">
            <Button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          <p className="text-xs text-green-500">Redirecting automatically in 5 seconds...</p>
        </CardContent>
      </Card>
    </div>
  )
}
