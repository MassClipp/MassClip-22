"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, ExternalLink, Info, RefreshCw } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { getAuth } from "firebase/auth"
import { app } from "@/firebase/firebase"
import ManualStripeConnect from "@/components/manual-stripe-connect"

interface DebugInfo {
  success: boolean
  isConnected: boolean
  accountId: string | null
  mode: string
  message: string
  accountStatus?: any
}

export default function TempStripeConnectPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [onboardingUrl, setOnboardingUrl] = useState("")
  const [creatingOnboarding, setCreatingOnboarding] = useState(false)

  useEffect(() => {
    fetchDebugInfo()
  }, [])

  const fetchDebugInfo = async () => {
    setLoading(true)
    try {
      const auth = getAuth(app)
      const user = auth.currentUser
      if (!user) {
        setDebugInfo({
          success: false,
          isConnected: false,
          accountId: null,
          mode: "test",
          message: "User not authenticated",
        })
        return
      }

      const idToken = await user.getIdToken()
      const response = await fetch("/api/stripe/connect/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })

      const data = await response.json()
      setDebugInfo(data)
      console.log("Debug info:", data)
    } catch (error) {
      console.error("Failed to fetch debug info:", error)
      setDebugInfo({
        success: false,
        isConnected: false,
        accountId: null,
        mode: "test",
        message: "Failed to fetch connection status",
      })
    } finally {
      setLoading(false)
    }
  }

  const createOnboardingLink = async () => {
    setCreatingOnboarding(true)
    try {
      const auth = getAuth(app)
      const user = auth.currentUser
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to create onboarding link",
          variant: "destructive",
        })
        return
      }

      const idToken = await user.getIdToken()
      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })

      const data = await response.json()

      if (data.success && data.url) {
        setOnboardingUrl(data.url)
        toast({
          title: "Onboarding Link Created",
          description: "Click the link below to complete Stripe onboarding",
        })
      } else {
        toast({
          title: "Failed to Create Link",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to create onboarding link:", error)
      toast({
        title: "Error",
        description: "Failed to create onboarding link",
        variant: "destructive",
      })
    } finally {
      setCreatingOnboarding(false)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Stripe Connect Integration</h1>
        <p className="text-muted-foreground">
          Connect your Stripe account to receive payments through the MassClip platform
        </p>
      </div>

      {/* Platform Info */}
      <Alert className="border-blue-600 bg-blue-600/10">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Platform Connection:</strong> This will connect your account to the MassClip platform
          (acct_1RFLa9Dheyb0pkWF) in test mode. You'll be able to receive payments through the MassClip marketplace.
        </AlertDescription>
      </Alert>

      {/* Test Environment Warning */}
      <Alert className="border-yellow-600 bg-yellow-600/10">
        <AlertDescription>
          <strong>Test Environment:</strong> All transactions will be simulated. Use test card numbers for testing
          payments.
        </AlertDescription>
      </Alert>

      {/* Connection Methods */}
      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="automatic">Automatic Setup</TabsTrigger>
          <TabsTrigger value="manual">Manual Connection</TabsTrigger>
        </TabsList>

        <TabsContent value="automatic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automatic Stripe Onboarding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create a new Stripe Express account or connect an existing one through Stripe's onboarding flow.
              </p>

              <div className="space-y-2">
                <Button onClick={createOnboardingLink} disabled={creatingOnboarding} className="w-full">
                  {creatingOnboarding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Onboarding Link...
                    </>
                  ) : (
                    "Start Stripe Onboarding"
                  )}
                </Button>

                {onboardingUrl && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Onboarding Link Created:</p>
                    <Button
                      variant="outline"
                      className="w-full bg-transparent"
                      onClick={() => window.open(onboardingUrl, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Complete Stripe Onboarding
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <ManualStripeConnect />
        </TabsContent>
      </Tabs>

      {/* Debug Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Debug Information</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchDebugInfo} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          {debugInfo ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={debugInfo.isConnected ? "default" : "secondary"}>
                  {debugInfo.isConnected ? "Connected" : "Not Connected"}
                </Badge>
              </div>

              {debugInfo.accountId && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Account ID:</span>
                  <code className="text-sm bg-muted px-2 py-1 rounded">{debugInfo.accountId}</code>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Mode:</span>
                <Badge variant="outline">{debugInfo.mode}</Badge>
              </div>

              <div>
                <span className="text-sm font-medium">Message:</span>
                <p className="text-sm text-muted-foreground mt-1">{debugInfo.message}</p>
              </div>

              {debugInfo.accountStatus && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Account Status:</p>
                  <pre className="text-xs overflow-auto">{JSON.stringify(debugInfo.accountStatus, null, 2)}</pre>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={() => window.history.back()}>
          Back to Dashboard
        </Button>
        <Button variant="outline" onClick={() => (window.location.href = "/dashboard/stripe/success")}>
          Regular Connect Page
        </Button>
      </div>
    </div>
  )
}
