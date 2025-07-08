"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, ArrowLeft, Loader2 } from "lucide-react"

export default function TestStripeRefresh() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    // Auto-redirect after 2 seconds
    const timer = setTimeout(() => {
      setIsRedirecting(true)
      router.push("/dashboard")
    }, 2000)

    return () => clearTimeout(timer)
  }, [router])

  const handleReturnToDashboard = () => {
    setIsRedirecting(true)
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md border-orange-200 bg-orange-50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <RefreshCw className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="text-orange-800">Setup Interrupted</CardTitle>
          <CardDescription className="text-orange-700">
            The test account setup process was interrupted or needs to be refreshed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-orange-100 p-3 text-center text-sm text-orange-800">
            You can try the setup process again from your dashboard.
          </div>

          <Button
            onClick={handleReturnToDashboard}
            disabled={isRedirecting}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
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

          <p className="text-xs text-orange-600 text-center">Automatically redirecting...</p>
        </CardContent>
      </Card>
    </div>
  )
}
