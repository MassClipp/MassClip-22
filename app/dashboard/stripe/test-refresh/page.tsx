"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, TestTube } from "lucide-react"

export default function StripeTestRefreshPage() {
  const router = useRouter()

  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      router.push("/dashboard")
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 p-4">
      <Card className="w-full max-w-md border-orange-200 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <RefreshCw className="h-8 w-8 text-orange-600 animate-spin" />
          </div>
          <CardTitle className="text-orange-800 flex items-center justify-center gap-2">
            <TestTube className="h-5 w-5" />
            Refreshing Test Setup
          </CardTitle>
          <CardDescription className="text-orange-700">Please try the onboarding process again.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800">
              If you're seeing this page, there may have been an issue with the onboarding flow. You'll be redirected
              back to continue the setup.
            </p>
          </div>

          <Button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
