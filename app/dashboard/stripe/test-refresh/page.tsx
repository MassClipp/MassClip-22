"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, ArrowLeft } from "lucide-react"

export default function TestStripeRefreshPage() {
  const router = useRouter()

  useEffect(() => {
    // Auto-redirect after a short delay
    const timer = setTimeout(() => {
      router.push("/dashboard")
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  const goToDashboard = () => {
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-orange-200 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <RefreshCw className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-orange-800">Setup Needs Completion</CardTitle>
          <CardDescription className="text-orange-700">
            Your test account setup was interrupted and needs to be completed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-orange-200 bg-orange-50">
            <RefreshCw className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              You can restart the setup process from your dashboard to complete the test account configuration.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm text-orange-700">
            <p>• Return to your dashboard</p>
            <p>• Find the Test Stripe Connect section</p>
            <p>• Click "Complete Setup" to continue</p>
          </div>

          <Button onClick={goToDashboard} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
