"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, ExternalLink, Loader2 } from "lucide-react"
import { getAuth } from "firebase/auth"

interface StripeStatus {
  connected: boolean
  accountId?: string
  status?: string
  isFullyEnabled: boolean
  actionsRequired: boolean
  actionUrl?: string
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  requirements: {
    currently_due: Array<{ field: string; description: string }>
    past_due: Array<{ field: string; description: string }>
    eventually_due: Array<{ field: string; description: string }>
    pending_verification: Array<{ field: string; description: string }>
  }
  disabled_reason?: string
  country?: string
  business_type?: string
  lastChecked?: number
  fromCache?: boolean
  warning?: string
  error?: string
  needsConnection?: boolean
  accountDeleted?: boolean
}

export function StripeStatusChecker() {
  const [status, setStatus] = useState<StripeStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRechecking, setIsRechecking] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const checkStatus = async (isRecheck = false) => {
    try {
      if (isRecheck) {
        setIsRechecking(true)
      } else {
        setIsLoading(true)
      }

      const auth = getAuth()
      const currentUser = auth.currentUser

      if (!currentUser) {
        setStatus({
          connected: false,
          error: "User not authenticated",
          needsConnection: true,
          isFullyEnabled: false,
          actionsRequired: false,
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false,
          requirements: {
            currently_due: [],
            past_due: [],
            eventually_due: [],
            pending_verification: [],
          },
        })
        return
      }

      const idToken = await currentUser.getIdToken()
      const endpoint = isRecheck ? "/api/stripe/recheck-status" : "/api/stripe/connection-status-on-login"
      const method = isRecheck ? "POST" : "GET"

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        setLastUpdate(new Date())
        console.log("✅ [Status Checker] Status updated:", data)
      } else {
        const errorData = await response.json()
        setStatus({
          connected: false,
          error: errorData.error || "Failed to check status",
          needsConnection: true,
          isFullyEnabled: false,
          actionsRequired: false,
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false,
          requirements: {
            currently_due: [],
            past_due: [],
            eventually_due: [],
            pending_verification: [],
          },
        })
      }
    } catch (error) {
      console.error("❌ [Status Checker] Error:", error)
      setStatus({
        connected: false,
        error: "Network error",
        needsConnection: true,
        isFullyEnabled: false,
        actionsRequired: false,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
        requirements: {
          currently_due: [],
          past_due: [],
          eventually_due: [],
          pending_verification: [],
        },
      })
    } finally {
      setIsLoading(false)
      setIsRechecking(false)
    }
  }

  useEffect(() => {
    checkStatus()
  }, [])

  const handleRecheck = () => {
    checkStatus(true)
  }

  const handleCompleteSetup = () => {
    if (status?.actionUrl) {
      window.location.href = status.actionUrl
    }
  }

  const handleConnect = () => {
    window.location.href = "/dashboard/connect-stripe"
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Checking Stripe connection...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return (
      <Card className="w-full border-red-200 bg-red-50">
        <CardContent className="py-6">
          <div className="flex items-center space-x-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="text-sm text-red-700">Failed to load Stripe status</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            Stripe Connection Status
            {status.connected ? (
              status.isFullyEnabled ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecheck}
            disabled={isRechecking}
            className="flex items-center gap-2 bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 ${isRechecking ? "animate-spin" : ""}`} />
            {isRechecking ? "Checking..." : "Recheck"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Status Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${status.connected ? "bg-green-500" : "bg-red-500"}`} />
            <div className="text-xs text-muted-foreground">Connected</div>
          </div>
          <div className="text-center">
            <div
              className={`w-3 h-3 rounded-full mx-auto mb-1 ${status.charges_enabled ? "bg-green-500" : "bg-yellow-500"}`}
            />
            <div className="text-xs text-muted-foreground">Payments</div>
          </div>
          <div className="text-center">
            <div
              className={`w-3 h-3 rounded-full mx-auto mb-1 ${status.payouts_enabled ? "bg-green-500" : "bg-yellow-500"}`}
            />
            <div className="text-xs text-muted-foreground">Payouts</div>
          </div>
        </div>

        {/* Account Info */}
        {status.connected && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Account ID:</span>
              <span className="font-mono text-xs">{status.accountId}</span>
            </div>
            {status.country && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Country:</span>
                <span>{status.country.toUpperCase()}</span>
              </div>
            )}
            {status.business_type && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Business Type:</span>
                <span className="capitalize">{status.business_type.replace(/_/g, " ")}</span>
              </div>
            )}
          </div>
        )}

        {/* Requirements */}
        {status.connected && status.actionsRequired && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-800 mb-2">Action Required</h4>
                <div className="space-y-1">
                  {status.requirements.currently_due.map((req, index) => (
                    <div key={index} className="text-sm text-yellow-700">
                      • {req.description}
                    </div>
                  ))}
                  {status.requirements.past_due.map((req, index) => (
                    <div key={index} className="text-sm text-red-700 font-medium">
                      • {req.description} (Past Due)
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {status.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-red-800 mb-1">Connection Issue</h4>
                <p className="text-sm text-red-700">{status.error}</p>
                {status.accountDeleted && (
                  <p className="text-xs text-red-600 mt-1">Your Stripe account may have been deleted or deactivated.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Warning */}
        {status.warning && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-700">{status.warning}</p>
                {status.fromCache && status.lastChecked && (
                  <p className="text-xs text-blue-600 mt-1">
                    Last successful check: {new Date(status.lastChecked).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {status.needsConnection ? (
            <Button onClick={handleConnect} className="flex-1">
              Connect Stripe Account
            </Button>
          ) : status.actionsRequired && status.actionUrl ? (
            <Button onClick={handleCompleteSetup} className="flex-1">
              <ExternalLink className="h-4 w-4 mr-2" />
              Complete Setup
            </Button>
          ) : status.isFullyEnabled ? (
            <div className="flex-1 text-center py-2 text-sm text-green-600 font-medium">
              ✅ Your Stripe account is fully set up and ready!
            </div>
          ) : null}
        </div>

        {/* Last Update Info */}
        {lastUpdate && (
          <div className="text-xs text-muted-foreground text-center">
            Last updated: {lastUpdate.toLocaleString()}
            {status.fromCache && " (cached)"}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
