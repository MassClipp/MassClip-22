"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Info, ArrowLeft, ExternalLink, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import ManualStripeConnect from "@/components/manual-stripe-connect"
import { getAuth, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import { app } from "@/firebase/firebase"

export default function TempStripeConnectPage() {
  const router = useRouter()
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const auth = getAuth(app)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setAuthLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Stripe Connect Integration</h1>
            <p className="text-zinc-400">Connect your Stripe account to receive payments through MassClip</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
          </div>
        </div>

        {/* Platform Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Alert className="border-blue-600 bg-blue-600/10">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Platform Connection:</strong> This will connect your account to the MassClip platform (
              <code className="text-xs">acct_1RFLa9Dheyb0pkWF</code>) in test mode. You'll be able to receive payments
              through the MassClip marketplace.
            </AlertDescription>
          </Alert>

          <Alert className="border-yellow-600 bg-yellow-600/10">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Test Environment:</strong> All transactions will be simulated. Use test card numbers for testing
              payments.
            </AlertDescription>
          </Alert>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="manual" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-800/50">
            <TabsTrigger value="automatic" className="data-[state=active]:bg-zinc-700">
              Automatic Setup
            </TabsTrigger>
            <TabsTrigger value="manual" className="data-[state=active]:bg-zinc-700">
              Manual Connection
            </TabsTrigger>
          </TabsList>

          <TabsContent value="automatic" className="space-y-6">
            <Card className="bg-zinc-900/60 border-zinc-800/50">
              <CardHeader>
                <CardTitle>Automatic Stripe Account Setup</CardTitle>
                <CardDescription>
                  Create a new Stripe Express account or connect an existing one through Stripe's onboarding flow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-blue-600 bg-blue-600/10">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    This option will guide you through Stripe's standard onboarding process to create or connect a
                    Stripe account.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-4">
                  <Button size="lg" className="flex-1">
                    Start Automatic Setup
                  </Button>
                  <Button variant="outline" size="lg">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Regular Connect Page
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-6">
            <ManualStripeConnect />
          </TabsContent>
        </Tabs>

        {/* Footer Links */}
        <div className="flex justify-center gap-4 mt-12 pt-8 border-t border-zinc-800">
          <Button variant="ghost" onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </Button>
          <Button variant="ghost" onClick={() => router.push("/dashboard/stripe/success")}>
            Regular Connect Page
          </Button>
        </div>
      </div>
    </div>
  )
}
