"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, Copy, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface StripeDebugInfo {
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
    info: any
    error: string | null
  }
  session_test: {
    session_id: string
    result: any
    error: string | null
  }
  recommendations: string[]
}

export default function StripeAccountDebugPage() {
  const [debugInfo, setDebugInfo] = useState<StripeDebugInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchDebugInfo = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/debug/stripe-account-info")
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setDebugInfo(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDebugInfo()
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "Text has been copied to your clipboard",
    })
  }

  const getStatusIcon = (recommendation: string) => {
    if (recommendation.startsWith("✅")) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (recommendation.startsWith("❌")) return <XCircle className="h-4 w-4 text-red-500" />
    if (recommendation.startsWith("⚠️")) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    return null
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
            <CardTitle className="text-red-600">Error Loading Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchDebugInfo} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stripe Account Debug Info</h1>
          <p className="text-muted-foreground">Detailed information about your Stripe configuration and account</p>
        </div>
        <Button onClick={fetchDebugInfo} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Environment Information */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Information</CardTitle>
          <CardDescription>Current deployment environment details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">NODE_ENV:</label>
              <div className="flex items-center gap-2">
                <Badge variant={debugInfo?.environment.NODE_ENV === "production" ? "default" : "secondary"}>
                  {debugInfo?.environment.NODE_ENV}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">VERCEL_ENV:</label>
              <div className="flex items-center gap-2">
                <Badge variant={debugInfo?.environment.VERCEL_ENV === "production" ? "default" : "secondary"}>
                  {debugInfo?.environment.VERCEL_ENV}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">VERCEL_URL:</label>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-muted px-2 py-1 rounded">{debugInfo?.environment.VERCEL_URL}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(debugInfo?.environment.VERCEL_URL || "")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">Last updated: {debugInfo?.timestamp}</div>
        </CardContent>
      </Card>

      {/* Stripe Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Stripe Configuration
            <Badge variant={debugInfo?.stripe_config.active_key_type === "LIVE" ? "default" : "destructive"}>
              {debugInfo?.stripe_config.active_key_type}
            </Badge>
          </CardTitle>
          <CardDescription>Active Stripe keys and environment variables</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Active Secret Key:</label>
            <div className="flex items-center gap-2">
              <code className="text-sm bg-muted px-2 py-1 rounded">{debugInfo?.stripe_config.active_key_prefix}</code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(debugInfo?.stripe_config.active_key_prefix || "")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Separator />

          <div>
            <label className="text-sm font-medium mb-2 block">Environment Variables</label>
            <div className="space-y-2">
              {Object.entries(debugInfo?.stripe_config.environment_variables || {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="font-mono text-sm">{key}</span>
                  <div className="flex items-center gap-2">
                    {value ? (
                      <>
                        <code className="text-sm">{value}</code>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </>
                    ) : (
                      <>
                        <span className="text-muted-foreground text-sm">null</span>
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
          <CardTitle>Stripe Account Information</CardTitle>
          <CardDescription>Details about the connected Stripe account</CardDescription>
        </CardHeader>
        <CardContent>
          {debugInfo?.stripe_account.error ? (
            <div className="text-red-600 p-4 bg-red-50 rounded">
              <strong>Error:</strong> {debugInfo.stripe_account.error}
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(debugInfo?.stripe_account.info || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-medium">{key.replace(/_/g, " ").toUpperCase()}:</span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Test */}
      <Card>
        <CardHeader>
          <CardTitle>Session Lookup Test</CardTitle>
          <CardDescription>Testing the problematic session ID</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Session ID:</label>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-muted px-2 py-1 rounded">{debugInfo?.session_test.session_id}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(debugInfo?.session_test.session_id || "")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {debugInfo?.session_test.error ? (
              <div className="text-red-600 p-4 bg-red-50 rounded">
                <strong>❌ Stripe Lookup</strong>
                <br />
                {debugInfo.session_test.error}
              </div>
            ) : (
              <div className="text-green-600 p-4 bg-green-50 rounded">
                <strong>✅ Session Found</strong>
                <pre className="mt-2 text-sm">{JSON.stringify(debugInfo?.session_test.result, null, 2)}</pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis & Recommendations</CardTitle>
          <CardDescription>Automated analysis of potential issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {debugInfo?.recommendations.map((rec, index) => (
              <div key={index} className="flex items-center gap-2 p-2 rounded">
                {getStatusIcon(rec)}
                <span className="text-sm">{rec}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
