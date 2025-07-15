"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, ArrowLeft, Home } from "lucide-react"
import Link from "next/link"
import ManualStripeConnect from "@/components/manual-stripe-connect"

export default function TempStripeConnectPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "refresh" | "error" | null>(null)
  const [message, setMessage] = useState("")

  useEffect(() => {
    const success = searchParams.get("success")
    const refresh = searchParams.get("refresh")
    const account = searchParams.get("account")

    if (success === "true") {
      setStatus("success")
      setMessage(account ? `Account ${account} connected successfully!` : "Account connected successfully!")
    } else if (refresh === "true") {
      setStatus("refresh")
      setMessage("Please complete the onboarding process and try again.")
    } else {
      setStatus(null)
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Stripe Connect Setup</h1>
            <p className="text-muted-foreground">Connect your Stripe account to start receiving payments</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/connect-stripe">
                <Home className="h-4 w-4 mr-2" />
                Regular Connect Page
              </Link>
            </Button>
          </div>
        </div>

        {/* Status Messages */}
        {status === "success" && (
          <Alert className="border-green-600 bg-green-600/10">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Success!</strong> {message}
            </AlertDescription>
          </Alert>
        )}

        {status === "refresh" && (
          <Alert className="border-yellow-600 bg-yellow-600/10">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Onboarding Incomplete:</strong> {message}
            </AlertDescription>
          </Alert>
        )}

        {status === "error" && (
          <Alert className="border-red-600 bg-red-600/10">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {message}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Automatic Setup */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Automatic Setup</h2>
              <p className="text-sm text-muted-foreground">
                Recommended for new users. Stripe will guide you through the entire setup process.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">What happens:</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Creates a new Stripe Express account</li>
                    <li>• Guides you through identity verification</li>
                    <li>• Sets up payment processing automatically</li>
                    <li>• Connects account to MassClip platform</li>
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground">
                  This is the easiest way to get started and works for both test and live modes.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Manual Connection */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Manual Connection</h2>
              <p className="text-sm text-muted-foreground">
                For users who already have a Stripe account and want to connect it directly.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Requirements:</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Existing Stripe account</li>
                    <li>• Account ID from Stripe Dashboard</li>
                    <li>• Account must match current mode (test/live)</li>
                    <li>• May require additional onboarding</li>
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use this if you already have a Stripe account set up and want to connect it manually.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Manual Connect Component */}
        <ManualStripeConnect />
      </div>
    </div>
  )
}
