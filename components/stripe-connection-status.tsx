"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

interface StripeConnectionStatusProps {
  userId: string
}

interface StripeStatus {
  connected: boolean
  accountId?: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  status: string
}

export function StripeConnectionStatus({ userId }: StripeConnectionStatusProps) {
  const [status, setStatus] = useState<StripeStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkStatus()
  }, [userId])

  const checkStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/stripe/connect/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error("Error checking Stripe status:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Unable to load Stripe status</p>
        </CardContent>
      </Card>
    )
  }

  const getStatusIcon = (enabled: boolean) => {
    if (enabled) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusBadge = () => {
    if (status.connected && status.detailsSubmitted && status.chargesEnabled) {
      return (
        <Badge variant="default" className="bg-green-500">
          Active
        </Badge>
      )
    }
    if (status.connected) {
      return <Badge variant="secondary">Pending</Badge>
    }
    return <Badge variant="destructive">Not Connected</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Stripe Connection</CardTitle>
            <CardDescription>Your payment processing status</CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            {getStatusIcon(status.connected)}
            <span className="text-sm">Account Connected</span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(status.detailsSubmitted)}
            <span className="text-sm">Details Submitted</span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(status.chargesEnabled)}
            <span className="text-sm">Charges Enabled</span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(status.payoutsEnabled)}
            <span className="text-sm">Payouts Enabled</span>
          </div>
        </div>

        {status.accountId && <div className="text-xs text-muted-foreground">Account ID: {status.accountId}</div>}

        <Button variant="outline" size="sm" onClick={checkStatus} className="w-full bg-transparent">
          Refresh Status
        </Button>
      </CardContent>
    </Card>
  )
}
