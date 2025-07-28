"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, Copy, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface StripeAccountInfo {
  timestamp: string
  environment: {
    NODE_ENV: string
    VERCEL_ENV: string
    VERCEL_URL: string
  }
  stripe_config: {
    active_key_type: string
    active_key_prefix: string | null
    environment_variables: Record<string, string | null>
  }
  stripe_account: {
    info: {
      id: string
      email: string
      display_name: string
      country: string
      default_currency: string
      type: string
      charges_enabled: boolean
      payouts_enabled: boolean
      details_submitted: boolean
    } | null
    error: string | null
  }
  session_test: {
    session_id: string
    result: {
      id: string
      status: string
      payment_status: string
      customer_email: string
      amount_total: number
      currency: string
      created: string
    } | null
    error: string | null
  }
  recommendations: string[]
}

export default function StripeAccountInfoPage() {
  const [accountInfo, setAccountInfo] = useState<StripeAccountInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchAccountInfo = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/debug/stripe-account-info")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch account info")
      }

      setAccountInfo(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccountInfo()
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "Information copied successfully",
    })
  }

  const getStatusIcon = (condition: boolean | null) => {
    if (condition === null) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    return condition ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />
  }

  const getKeyTypeBadge = (keyType: string) => {
    const variant = keyType === "LIVE" ? "default" : keyType === "TEST" ? "secondary" : "destructive"
    return <Badge variant={variant}>{keyType}</Badge>
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Account Info</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchAccountInfo} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!accountInfo) return null

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stripe Account Debug Info</h1>
          <p className="text-muted-foreground">Detailed information about your Stripe configuration and account</p>
        </div>
        <Button onClick={fetchAccountInfo} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Information</CardTitle>
          <CardDescription>Current deployment environment details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="font-medium">NODE_ENV:</span>
              <Badge variant="outline" className="ml-2">
                {accountInfo.environment.NODE_ENV}
              </Badge>
            </div>
            <div>
              <span className="font-medium">VERCEL_ENV:</span>
              <Badge variant="outline" className="ml-2">
                {accountInfo.environment.VERCEL_ENV || "N/A"}
              </Badge>
            </div>
            <div>
              <span className="font-medium">VERCEL_URL:</span>
              <span className="ml-2 text-sm text-muted-foreground">{accountInfo.environment.VERCEL_URL || "N/A"}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Last updated: {accountInfo.timestamp}</p>
        </CardContent>
      </Card>

      {/* Stripe Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Stripe Configuration
            {getKeyTypeBadge(accountInfo.stripe_config.active_key_type)}
          </CardTitle>
          <CardDescription>Active Stripe keys and environment variables</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className="font-medium">Active Secret Key:</span>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-muted px-2 py-1 rounded text-sm">
                {accountInfo.stripe_config.active_key_prefix || "Not set"}
              </code>
              {accountInfo.stripe_config.active_key_prefix && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(accountInfo.stripe_config.active_key_prefix!)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">Environment Variables</h4>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(accountInfo.stripe_config.environment_variables).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="font-mono text-sm">{key}</span>
                  <div className="flex items-center gap-2">
                    {value ? (
                      <>
                        <code className="text-xs bg-background px-2 py-1 rounded">{value}</code>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-muted-foreground">Not set</span>
                        <XCircle className="h-4 w-4 text-red-500" />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Stripe Account Information
            {getStatusIcon(!!accountInfo.stripe_account.info)}
          </CardTitle>
          <CardDescription>Details about the connected Stripe account</CardDescription>
        </CardHeader>
        <CardContent>
          {accountInfo.stripe_account.info ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Account ID:</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-muted px-2 py-1 rounded text-sm">{accountInfo.stripe_account.info.id}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(accountInfo.stripe_account.info!.id)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div>
                <span className="font-medium">Email:</span>
                <p className="text-sm text-muted-foreground mt-1">{accountInfo.stripe_account.info.email}</p>
              </div>
              <div>
                <span className="font-medium">Display Name:</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {accountInfo.stripe_account.info.display_name || "N/A"}
                </p>
              </div>
              <div>
                <span className="font-medium">Country:</span>
                <Badge variant="outline" className="ml-2">
                  {accountInfo.stripe_account.info.country}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Currency:</span>
                <Badge variant="outline" className="ml-2">
                  {accountInfo.stripe_account.info.default_currency.toUpperCase()}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Account Type:</span>
                <Badge variant="outline" className="ml-2">
                  {accountInfo.stripe_account.info.type}
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {getStatusIcon(accountInfo.stripe_account.info.charges_enabled)}
                  <span className="text-sm">Charges Enabled</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(accountInfo.stripe_account.info.payouts_enabled)}
                  <span className="text-sm">Payouts Enabled</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-red-600">
              <p className="font-medium">Failed to retrieve account information</p>
              <p className="text-sm mt-1">{accountInfo.stripe_account.error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Session Lookup Test
            {getStatusIcon(!!accountInfo.session_test.result)}
          </CardTitle>
          <CardDescription>Testing session retrieval with the problematic session ID</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <span className="font-medium">Test Session ID:</span>
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-muted px-2 py-1 rounded text-sm break-all">
                  {accountInfo.session_test.session_id}
                </code>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(accountInfo.session_test.session_id)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {accountInfo.session_test.result ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg">
                <div>
                  <span className="font-medium text-green-800">Status:</span>
                  <Badge variant="outline" className="ml-2">
                    {accountInfo.session_test.result.status}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium text-green-800">Payment Status:</span>
                  <Badge variant="outline" className="ml-2">
                    {accountInfo.session_test.result.payment_status}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium text-green-800">Amount:</span>
                  <span className="ml-2">
                    {accountInfo.session_test.result.amount_total / 100}{" "}
                    {accountInfo.session_test.result.currency.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-green-800">Created:</span>
                  <span className="ml-2 text-sm">
                    {new Date(accountInfo.session_test.result.created).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="font-medium text-red-800">Session Lookup Failed</p>
                <p className="text-sm text-red-600 mt-1">{accountInfo.session_test.error}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>Analysis and suggestions based on your configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {accountInfo.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-2">
                {rec.startsWith("✅") ? (
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                ) : rec.startsWith("⚠️") ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                )}
                <span className="text-sm">{rec.replace(/^[✅⚠️❌]\s*/, "")}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
