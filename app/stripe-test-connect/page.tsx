"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, AlertTriangle, ExternalLink, RefreshCw, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface StripeAccount {
  id: string
  email?: string
  country?: string
  default_currency?: string
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  requirements?: {
    currently_due: string[]
    eventually_due: string[]
    past_due: string[]
  }
}

interface ConnectionStatus {
  connected: boolean
  account?: StripeAccount
  isTestMode: boolean
  error?: string
}

export default function StripeTestConnectPage() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const { toast } = useToast()

  // Check current connection status on load
  useEffect(() => {
    checkConnectionStatus()
  }, [])

  const checkConnectionStatus = async () => {
    setChecking(true)
    try {
      const response = await fetch("/api/stripe-test-connect/status")
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error("Failed to check connection status:", error)
      setStatus({ connected: false, isTestMode: false, error: "Failed to check status" })
    } finally {
      setChecking(false)
    }
  }

  const initiateConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/stripe-test-connect/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (data.success && data.url) {
        // Redirect to Stripe Connect onboarding
        window.location.href = data.url
      } else {
        throw new Error(data.error || "Failed to create connection link")
      }
    } catch (error) {
      console.error("Connection failed:", error)
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const disconnectAccount = async () => {
    if (!confirm("Are you sure you want to disconnect the test Stripe account?")) return

    setLoading(true)
    try {
      const response = await fetch("/api/stripe-test-connect/disconnect", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Account Disconnected",
          description: "Test Stripe account has been disconnected successfully",
        })
        await checkConnectionStatus()
      } else {
        throw new Error(data.error || "Failed to disconnect account")
      }
    } catch (error) {
      console.error("Disconnect failed:", error)
      toast({
        title: "Disconnect Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Checking connection status...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Stripe Test Mode Connection</h1>
        <p className="text-muted-foreground">
          Connect your Stripe account in test mode for development and testing purposes.
        </p>
      </div>

      {/* Test Mode Warning */}
      <Alert className="mb-6 border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>Test Mode Only:</strong> This page is designed exclusively for test mode connections. No real payments
          will be processed.
        </AlertDescription>
      </Alert>

      {/* Environment Check */}
      {status && !status.isTestMode && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Warning:</strong> Not in test mode! This page should only be used with test Stripe keys.
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {status?.connected ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span>Connection Status</span>
          </CardTitle>
          <CardDescription>Current Stripe account connection status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant={status?.connected ? "default" : "secondary"}>
                {status?.connected ? "Connected" : "Not Connected"}
              </Badge>
              {status?.isTestMode && (
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  Test Mode
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={checkConnectionStatus} disabled={checking}>
              <RefreshCw className={`h-4 w-4 mr-2 ${checking ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {status?.error && (
            <Alert className="mt-4 border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{status.error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Account Details */}
      {status?.connected && status.account && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Connected Account Details</CardTitle>
            <CardDescription>Information about your connected test Stripe account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account ID</label>
                <p className="font-mono text-sm bg-muted p-2 rounded">{status.account.id}</p>
              </div>
              {status.account.email && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm">{status.account.email}</p>
                </div>
              )}
              {status.account.country && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Country</label>
                  <p className="text-sm">{status.account.country.toUpperCase()}</p>
                </div>
              )}
              {status.account.default_currency && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Currency</label>
                  <p className="text-sm">{status.account.default_currency.toUpperCase()}</p>
                </div>
              )}
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Capabilities</label>
              <div className="flex flex-wrap gap-2">
                <Badge variant={status.account.charges_enabled ? "default" : "secondary"}>
                  {status.account.charges_enabled ? "✓" : "✗"} Charges
                </Badge>
                <Badge variant={status.account.payouts_enabled ? "default" : "secondary"}>
                  {status.account.payouts_enabled ? "✓" : "✗"} Payouts
                </Badge>
                <Badge variant={status.account.details_submitted ? "default" : "secondary"}>
                  {status.account.details_submitted ? "✓" : "✗"} Details Submitted
                </Badge>
              </div>
            </div>

            {status.account.requirements && (
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Requirements</label>
                <div className="space-y-2">
                  {status.account.requirements.currently_due.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-red-600">Currently Due:</p>
                      <p className="text-sm text-muted-foreground">
                        {status.account.requirements.currently_due.join(", ")}
                      </p>
                    </div>
                  )}
                  {status.account.requirements.eventually_due.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-orange-600">Eventually Due:</p>
                      <p className="text-sm text-muted-foreground">
                        {status.account.requirements.eventually_due.join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Manage your test Stripe account connection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!status?.connected ? (
            <Button onClick={initiateConnection} disabled={loading || !status?.isTestMode} className="w-full">
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating Connection...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect Test Stripe Account
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={checkConnectionStatus}
                disabled={checking}
                className="w-full bg-transparent"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${checking ? "animate-spin" : ""}`} />
                Refresh Account Status
              </Button>
              <Button variant="destructive" onClick={disconnectAccount} disabled={loading} className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Disconnect Test Account
              </Button>
            </div>
          )}

          {!status?.isTestMode && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Connection disabled: Not in test mode. Please ensure you're using test Stripe keys.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Development Notice */}
      <Alert className="mt-6 border-blue-200 bg-blue-50">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Development Tool:</strong> This page is for development and testing only. Remove or disable this page
          before deploying to production.
        </AlertDescription>
      </Alert>
    </div>
  )
}
