"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"
import StripeAccountLinker from "@/components/stripe-account-linker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ConnectStripePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      checkStripeConnection()
    } else if (!authLoading) {
      router.push("/login")
    }
  }, [user, authLoading])

  const checkStripeConnection = async () => {
    try {
      setChecking(true)
      setConnectionError(null)

      const response = await fetch("/api/stripe/connection-status")
      const data = await response.json()

      if (response.ok && data.success && data.connected) {
        setIsConnected(true)
        // Redirect to earnings page if already connected
        setTimeout(() => {
          router.push("/dashboard/earnings")
        }, 2000)
      } else if (!response.ok) {
        setConnectionError(`API Error: ${response.status} - ${data.error || "Unknown error"}`)
      }
    } catch (error: any) {
      console.error("Error checking Stripe connection:", error)
      setConnectionError(`Network error: ${error.message}`)
    } finally {
      setChecking(false)
    }
  }

  const handleSuccess = () => {
    setIsConnected(true)
    // Redirect to earnings page after successful connection
    setTimeout(() => {
      router.push("/dashboard/earnings")
    }, 2000)
  }

  if (authLoading || checking) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 text-zinc-500 animate-spin mx-auto" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-white">
              {authLoading ? "Authenticating..." : "Checking Stripe connection..."}
            </p>
            <p className="text-sm text-zinc-400">Please wait while we verify your account</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  if (isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle className="h-16 w-16 text-green-400" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-green-300">Already Connected!</h3>
                <p className="text-sm text-muted-foreground">
                  Your Stripe account is connected. Redirecting to earnings...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <main className="flex justify-center pt-10 px-4">
      <div className="w-full max-w-md space-y-6">
        {connectionError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Connection check failed: {connectionError}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <div className="text-2xl">💳</div>
            </div>
            <div>
              <CardTitle className="text-2xl">Connect Your Stripe Account</CardTitle>
              <p className="text-muted-foreground mt-2">Start accepting payments and track your earnings</p>
            </div>
          </CardHeader>
          <CardContent>
            <StripeAccountLinker onSuccess={handleSuccess} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <div className="mx-auto w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center">
              <div className="text-lg">💰</div>
            </div>
            <div>
              <h4 className="font-medium text-sm">Accept Payments</h4>
              <p className="text-xs text-muted-foreground">Process payments from customers worldwide</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="mx-auto w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center">
              <div className="text-lg">🌍</div>
            </div>
            <div>
              <h4 className="font-medium text-sm">Global Reach</h4>
              <p className="text-xs text-muted-foreground">Supported in 40+ countries</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="mx-auto w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center">
              <div className="text-lg">🔒</div>
            </div>
            <div>
              <h4 className="font-medium text-sm">Secure & Reliable</h4>
              <p className="text-xs text-muted-foreground">Bank-level security and encryption</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
