"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react"

interface StripeAccountStatus {
  connected: boolean
  canAcceptPayments: boolean
  status: string
  message: string
  suggestedActions: string[]
  accountId?: string
  detailsSubmitted?: boolean
  chargesEnabled?: boolean
  payoutsEnabled?: boolean
  requirements?: {
    currentlyDue: string[]
    eventuallyDue: string[]
    pastDue: string[]
    pendingVerification: string[]
  }
}

export default function StripeAccountStatus() {
  const [status, setStatus] = useState<StripeAccountStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/stripe/account/verify")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to fetch account status")
      }

      setStatus(data)
    } catch (err) {
      console.error("Error fetching Stripe status:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const getStatusIcon = () => {
    if (!status) return null

    if (status.canAcceptPayments) {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    } else if (status.connected) {
      return <AlertCircle className="h-5 w-5 text-yellow-600" />
    } else {
      return <XCircle className="h-5 w-5 text-red-600" />
    }
  }

  const getStatusColor = () => {
    if (!status) return "gray"

    if (status.canAcceptPayments) return "green"
    if (status.connected) return "yellow"
    return "red"
  }

  const getStatusText = () => {
    if (!status) return "Unknown"

    if (status.canAcceptPayments) return "Active"
    if (status.connected) return "Setup Required"
    return "Not Connected"
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Checking Stripe account status...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="space-y-2">
                <div>Failed to check Stripe account status: {error}</div>
                <Button variant="outline" size="sm" onClick={fetchStatus} className="mt-2">
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon()}
              Stripe Account Status
            </CardTitle>
            <CardDescription>Your payment processing setup status</CardDescription>
          </div>
          <Badge variant={getStatusColor() === "green" ? "default" : "secondary"}>{getStatusText()}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Message */}
        <Alert className={`border-${getStatusColor()}-200 bg-${getStatusColor()}-50`}>
          <AlertDescription className={`text-${getStatusColor()}-800`}>{status.message}</AlertDescription>
        </Alert>

        {/* Account Details */}
        {status.connected && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Details Submitted:</span>
              <Badge variant={status.detailsSubmitted ? "default" : "secondary"} className="ml-2">
                {status.detailsSubmitted ? "Yes" : "No"}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Charges Enabled:</span>
              <Badge variant={status.chargesEnabled ? "default" : "secondary"} className="ml-2">
                {status.chargesEnabled ? "Yes" : "No"}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Payouts Enabled:</span>
              <Badge variant={status.payoutsEnabled ? "default" : "secondary"} className="ml-2">
                {status.payoutsEnabled ? "Yes" : "No"}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Can Accept Payments:</span>
              <Badge variant={status.canAcceptPayments ? "default" : "secondary"} className="ml-2">
                {status.canAcceptPayments ? "Yes" : "No"}
              </Badge>
            </div>
          </div>
        )}

        {/* Requirements */}
        {status.requirements && (
          <div className="space-y-3">
            {status.requirements.pastDue.length > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <div className="font-medium mb-1">Overdue Requirements:</div>
                  <ul className="list-disc list-inside text-sm">
                    {status.requirements.pastDue.map((req, index) => (
                      <li key={index}>{req.replace(/_/g, " ")}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {status.requirements.currentlyDue.length > 0 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <div className="font-medium mb-1">Current Requirements:</div>
                  <ul className="list-disc list-inside text-sm">
                    {status.requirements.currentlyDue.map((req, index) => (
                      <li key={index}>{req.replace(/_/g, " ")}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {status.requirements.pendingVerification.length > 0 && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <div className="font-medium mb-1">Pending Verification:</div>
                  <ul className="list-disc list-inside text-sm">
                    {status.requirements.pendingVerification.map((req, index) => (
                      <li key={index}>{req.replace(/_/g, " ")}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Suggested Actions */}
        {status.suggestedActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Recommended Actions:</h4>
            <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
              {status.suggestedActions.map((action, index) => (
                <li key={index}>{action}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={fetchStatus}>
            Refresh Status
          </Button>

          {status.accountId && (
            <Button variant="outline" size="sm" onClick={() => window.open("https://dashboard.stripe.com", "_blank")}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Stripe Dashboard
            </Button>
          )}

          {!status.connected && (
            <Button size="sm" onClick={() => (window.location.href = "/dashboard/settings/stripe")}>
              Connect Stripe
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
