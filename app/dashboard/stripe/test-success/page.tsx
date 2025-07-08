"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, ArrowLeft, Loader2 } from "lucide-react"

export default function TestStripeSuccess() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      setIsRedirecting(true)
      router.push("/dashboard")
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  const handleReturnToDashboard = () => {
    setIsRedirecting(true)
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md border-green-200 bg-green-50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-green-800">Test Account Setup Complete!</CardTitle>
          <CardDescription className="text-green-700">
            Your test Stripe Connect account has been successfully configured.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-green-100 p-3 text-center text-sm text-green-800">
            You can now test end-to-end purchases with real webhook data in preview mode.
          </div>

          <Button
            onClick={handleReturnToDashboard}
            disabled={isRedirecting}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {isRedirecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Redirecting...
              </>
            ) : (
              <>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Dashboard
              </>
            )}
          </Button>

          <p className="text-xs text-green-600 text-center">Automatically redirecting in a few seconds...</p>
        </CardContent>
      </Card>
    </div>
  )
}
