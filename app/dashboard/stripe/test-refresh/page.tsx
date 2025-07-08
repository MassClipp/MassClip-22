"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, ArrowLeft } from "lucide-react"

export default function TestStripeRefreshPage() {
  const router = useRouter()

  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      router.push("/dashboard")
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100">
      <Card className="w-full max-w-md border-orange-200 bg-white/80 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <RefreshCw className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-orange-800">Setup Refreshed</CardTitle>
          <CardDescription className="text-orange-700">
            Continue setting up your test Stripe Connect account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-orange-600">You can continue the onboarding process from your dashboard.</p>

          <div className="space-y-2">
            <Button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          <p className="text-xs text-orange-500">Redirecting automatically in 3 seconds...</p>
        </CardContent>
      </Card>
    </div>
  )
}
