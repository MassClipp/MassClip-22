"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface StripeConnectionData {
  connected: boolean
  accountId?: string
  chargesEnabled?: boolean
  payoutsEnabled?: boolean
  detailsSubmitted?: boolean
  requirementsCount?: number
  currentlyDue?: string[]
  pastDue?: string[]
  pendingVerification?: string[]
}

export function StripeConnectionStatus() {
  const [connectionData, setConnectionData] = useState<StripeConnectionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  const fetchConnectionStatus = async () => {
    try {
      const response = await fetch("/api/stripe/connect/status")
      if (!response.ok) {
        throw new Error("Failed to fetch connection status")
      }
      const data = await response.json()
      setConnectionData(data)
    } catch (error) {
      console.error("Error fetching Stripe connection status:", error)
      toast({
        title: "Error",
        description: "Failed to fetch Stripe connection status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchConnectionStatus()
  }

  useEffect(() => {
    fetchConnectionStatus()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Checking Stripe Connection...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (!connectionData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Connection Status Unknown
          </CardTitle>
          <CardDescription>Unable to determine Stripe connection status</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRefresh} disabled={refreshing}>
            {refreshing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const getStatusIcon = () => {
    if (!connectionData.connected) {
      return <XCircle className="h-5 w-5 text-red-500" />
    }
    if (connectionData.chargesEnabled && connectionData.payoutsEnabled) {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    }
    return <AlertCircle className="h-5 w-5 text-yellow-500" />
  }

  const getStatusText = () => {
    if (!connectionData.connected) {
      return "Not Connected"
    }
    if (connectionData.chargesEnabled && connectionData.payoutsEnabled) {
      return "Fully Connected"
    }
    return "Setup Required"
  }

  const getStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (!connectionData.connected) return "destructive"
    if (connectionData.chargesEnabled && connectionData.payoutsEnabled) return "default"
    return "secondary"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            Stripe Connection Status
          </div>
          <Badge variant={getStatusVariant()}>{getStatusText()}</Badge>
        </CardTitle>
        {connectionData.accountId && <CardDescription>Account ID: {connectionData.accountId}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {connectionData.connected && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              {connectionData.chargesEnabled ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Charges Enabled</span>
            </div>
            <div className="flex items-center gap-2">
              {connectionData.payoutsEnabled ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Payouts Enabled</span>
            </div>
            <div className="flex items-center gap-2">
              {connectionData.detailsSubmitted ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Details Submitted</span>
            </div>
          </div>
        )}

        {connectionData.requirementsCount && connectionData.requirementsCount > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-yellow-600">
              Requirements Needed ({connectionData.requirementsCount})
            </h4>
            {connectionData.currentlyDue && connectionData.currentlyDue.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Currently Due:</p>
                <ul className="text-xs text-muted-foreground ml-4">
                  {connectionData.currentlyDue.map((requirement, index) => (
                    <li key={index}>• {requirement}</li>
                  ))}
                </ul>
              </div>
            )}
            {connectionData.pastDue && connectionData.pastDue.length > 0 && (
              <div>
                <p className="text-xs text-red-600">Past Due:</p>
                <ul className="text-xs text-red-600 ml-4">
                  {connectionData.pastDue.map((requirement, index) => (
                    <li key={index}>• {requirement}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
            {refreshing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Refresh Status
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default StripeConnectionStatus
