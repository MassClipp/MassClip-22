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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-orange-200 bg-orange-50">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <RefreshCw className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="text-orange-800">Setup Interrupted</CardTitle>
          <CardDescription className="text-orange-700">
            The test account setup process was interrupted or needs to be refreshed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-orange-700">
            You can try the setup process again from your dashboard.
          </div>
          <Button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Dashboard
          </Button>
          <div className="text-xs text-center text-orange-600">Redirecting automatically in 3 seconds...</div>
        </CardContent>
      </Card>
    </div>
  )
}
