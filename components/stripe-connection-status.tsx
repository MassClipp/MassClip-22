"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, ExternalLink, RefreshCw } from "lucide-react"

interface StripeConnectionStatusProps {
  userId: string
  onStatusChange?: (status: "checking" | "connected" | "not_connected") => void
}

interface StripeStatus {
  connected: boolean
  accountId?: string
  chargesEnabled?: boolean
  payoutsEnabled?: boolean
  detailsSubmitted?: boolean
  requiresAction?: boolean
  error?: string
}

export function StripeConnectionStatus({ userId, onStatusChange }: StripeConnectionStatusProps) {
  const [status, setStatus] = useState<StripeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/stripe/connect/status")
      const data = await response.json()

      setStatus(data)
      onStatusChange?.(data.connected ? "connected" : "not_connected")
    } catch (error) {
      console.error("Error fetching Stripe status:", error)
      setStatus({ connected: false, error: "Failed to fetch status" })
      onStatusChange?.("not_connected")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchStatus()
  }

  useEffect(() => {
    fetchStatus()
  }, [userId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Unable to load connection status. Please try again.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Stripe Connection Status</CardTitle>
          <CardDescription>Current status of your Stripe account integration</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="font-medium mb-1">Connection Error</div>
              {status.error}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Account Connected</span>
            <Badge variant={status.connected ? "default" : "secondary"}>
              {status.connected ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </>
              ) : (
                "Not Connected"
              )}
            </Badge>
          </div>

          {status.connected && status.accountId && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Account ID</span>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">{status.accountId}</code>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Accept Payments</span>
                <Badge variant={status.chargesEnabled ? "default" : "secondary"}>
                  {status.chargesEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Receive Payouts</span>
                <Badge variant={status.payoutsEnabled ? "default" : "secondary"}>
                  {status.payoutsEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Details Submitted</span>
                <Badge variant={status.detailsSubmitted ? "default" : "secondary"}>
                  {status.detailsSubmitted ? "Complete" : "Incomplete"}
                </Badge>
              </div>

              {status.requiresAction && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    <div className="font-medium mb-1">Action Required</div>
                    Your Stripe account requires additional information or verification.
                    <Button variant="link" className="p-0 h-auto text-yellow-800 underline" asChild>
                      <a
                        href={`https://dashboard.stripe.com/connect/accounts/${status.accountId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Complete setup in Stripe Dashboard
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {status.connected && status.chargesEnabled && status.payoutsEnabled && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <div className="font-medium mb-1">Ready to Accept Payments</div>
                    Your Stripe account is fully set up and ready to process payments.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default StripeConnectionStatus
