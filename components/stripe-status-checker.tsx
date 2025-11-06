"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from "lucide-react"

interface StripeAccountStatus {
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  country: string
  business_type: string
  disabled_reason: string | null
  requirements: {
    currently_due: string[]
    past_due: string[]
    eventually_due: string[]
    pending_verification: string[]
  }
  last_verified: string
}

interface ConnectionStatus {
  connected: boolean
  status: string
  account_id?: string
  account_status?: StripeAccountStatus
  last_updated?: string
  cached?: boolean
  warning?: string
  message?: string
  action_required?: string
}

export function StripeStatusChecker() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRechecking, setIsRechecking] = useState(false)
  const { toast } = useToast()
  const { user } = useFirebaseAuth()

  const checkStatus = async (showToast = false) => {
    if (!user) return

    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/stripe/connection-status-on-login", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to check status")
      }

      setConnectionStatus(data)

      if (showToast) {
        toast({
          title: "Status Updated",
          description: "Stripe connection status has been refreshed",
        })
      }
    } catch (error: any) {
      console.error("Failed to check Stripe status:", error)
      if (showToast) {
        toast({
          title: "Status Check Failed",
          description: error.message,
          variant: "destructive",
        })
      }
    }
  }

  const recheckStatus = async () => {
    if (!user) return

    setIsRechecking(true)
    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/stripe/recheck-status", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to recheck status")
      }

      // Update local state with fresh data
      setConnectionStatus({
        connected: data.success,
        status: data.status,
        account_id: data.account_id,
        account_status: data.account_status,
        last_updated: data.last_updated,
        cached: false,
      })

      toast({
        title: "Status Rechecked",
        description: data.message || "Stripe status updated successfully",
      })
    } catch (error: any) {
      console.error("Failed to recheck Stripe status:", error)
      toast({
        title: "Recheck Failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsRechecking(false)
    }
  }

  useEffect(() => {
    if (user) {
      setIsLoading(true)
      checkStatus().finally(() => setIsLoading(false))
    }
  }, [user])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Checking Stripe Connection...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (!connectionStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-4 w-4" />
            Connection Check Failed
          </CardTitle>
          <CardDescription>Unable to verify Stripe connection status</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => checkStatus(true)} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!connectionStatus.connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-600">
            <XCircle className="h-4 w-4" />
            No Stripe Connection
          </CardTitle>
          <CardDescription>
            {connectionStatus.message || "Connect your Stripe account to start receiving payments"}
          </CardDescription>
        </CardHeader>
        {connectionStatus.action_required === "reconnect" && (
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your previous Stripe connection is no longer valid. Please reconnect your account.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>
    )
  }

  const { account_status } = connectionStatus
  const isFullyVerified = account_status?.charges_enabled && account_status?.payouts_enabled

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isFullyVerified ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <Clock className="h-4 w-4 text-yellow-600" />
          )}
          Stripe Connection Status
          <Badge variant={isFullyVerified ? "default" : "secondary"}>{connectionStatus.status}</Badge>
        </CardTitle>
        <CardDescription>
          Account ID: {connectionStatus.account_id}
          {connectionStatus.cached && " (cached)"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {connectionStatus.warning && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{connectionStatus.warning}</AlertDescription>
          </Alert>
        )}

        {account_status && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                {account_status.charges_enabled ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">Charges Enabled</span>
              </div>
              <div className="flex items-center gap-2">
                {account_status.payouts_enabled ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">Payouts Enabled</span>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p>Country: {account_status.country}</p>
              <p>Business Type: {account_status.business_type}</p>
              {account_status.disabled_reason && (
                <p className="text-red-600">Disabled: {account_status.disabled_reason}</p>
              )}
            </div>

            {account_status.requirements.currently_due.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Action Required:</strong> Complete these requirements in your Stripe dashboard:
                  <ul className="list-disc list-inside mt-1">
                    {account_status.requirements.currently_due.map((req, index) => (
                      <li key={index} className="text-xs">
                        {req.replace(/_/g, " ")}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {account_status.requirements.past_due.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Past Due:</strong> These requirements are overdue:
                  <ul className="list-disc list-inside mt-1">
                    {account_status.requirements.past_due.map((req, index) => (
                      <li key={index} className="text-xs">
                        {req.replace(/_/g, " ")}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={recheckStatus} disabled={isRechecking} variant="outline" size="sm">
            {isRechecking ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Recheck Status
          </Button>

          {connectionStatus.last_updated && (
            <div className="text-xs text-gray-500 flex items-center">
              Last updated: {new Date(connectionStatus.last_updated).toLocaleString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
