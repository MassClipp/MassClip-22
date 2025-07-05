"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Bug,
  Settings,
  ArrowLeft,
  ExternalLink,
  Copy,
  Info,
} from "lucide-react"
import Link from "next/link"

interface StripeConfig {
  stripeKeyExists: boolean
  stripeKeyPrefix: string
  isTestMode: boolean
  isLiveMode: boolean
  environment: string
  timestamp: string
}

interface SessionDebugResult {
  success?: boolean
  error?: string
  session?: any
  environment?: any
  recommendation?: string
  configurationSteps?: string[]
}

export default function DebugStripeConfigPage() {
  const { toast } = useToast()
  const [config, setConfig] = useState<StripeConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState("")
  const [debugResult, setDebugResult] = useState<SessionDebugResult | null>(null)
  const [debugLoading, setDebugLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<string>("")
  const [environmentInfo, setEnvironmentInfo] = useState<any>(null)

  const fetchStripeConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/debug/stripe-config")

      if (!response.ok) {
        throw new Error("Failed to fetch Stripe configuration")
      }

      const data = await response.json()
      setConfig(data)
      setLastChecked(new Date().toLocaleString())

      // Also fetch environment-specific info
      const envResponse = await fetch("/api/debug/environment-info")
      if (envResponse.ok) {
        const envData = await envResponse.json()
        setEnvironmentInfo(envData)
      }
    } catch (error) {
      console.error("Error fetching Stripe config:", error)
      toast({
        title: "Error",
        description: "Failed to fetch Stripe configuration",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const debugSession = async () => {
    if (!sessionId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a session ID",
        variant: "destructive",
      })
      return
    }

    try {
      setDebugLoading(true)
      setDebugResult(null)

      const response = await fetch("/api/debug/stripe-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: sessionId.trim() }),
      })

      const data = await response.json()
      setDebugResult(data)

      if (response.ok) {
        toast({
          title: "Debug Complete",
          description: "Session debug information retrieved successfully",
        })
      } else {
        toast({
          title: "Debug Failed",
          description: data.error || "Failed to debug session",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error debugging session:", error)
      toast({
        title: "Error",
        description: "Failed to debug session",
        variant: "destructive",
      })
    } finally {
      setDebugLoading(false)
    }
  }

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId)
    toast({
      title: "Copied!",
      description: "Session ID copied to clipboard",
    })
  }

  const copyDebugResult = () => {
    if (debugResult) {
      navigator.clipboard.writeText(JSON.stringify(debugResult, null, 2))
      toast({
        title: "Copied!",
        description: "Debug result copied to clipboard",
      })
    }
  }

  useEffect(() => {
    fetchStripeConfig()
  }, [])

  const getStatusIcon = (exists: boolean) => {
    return exists ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />
  }

  const getModeColor = (isLive: boolean) => {
    return isLive ? "bg-red-500" : "bg-amber-500"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button asChild variant="outline" size="sm" className="border-gray-600 bg-transparent">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Stripe Configuration Debug</h1>
            <p className="text-gray-400">Diagnose Stripe configuration and session issues</p>
          </div>
          <Button asChild variant="outline" size="sm" className="border-gray-600 ml-auto bg-transparent">
            <Link href="https://dashboard.stripe.com" target="_blank">
              <ExternalLink className="h-4 w-4 mr-2" />
              Stripe Dashboard
            </Link>
          </Button>
        </div>

        {/* Stripe Configuration */}
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-white">Stripe Configuration</CardTitle>
            </div>
            <CardDescription>Check your Stripe API key configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-400">Loading configuration...</span>
              </div>
            ) : config ? (
              <>
                <div className="flex justify-between items-center">
                  <Button
                    onClick={fetchStripeConfig}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 bg-transparent"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Check Stripe Config
                  </Button>
                  <Badge variant="outline" className="border-blue-500 text-blue-400">
                    {getStatusIcon(config.stripeKeyExists)}
                    <span className="ml-1">{config.stripeKeyExists ? "Yes" : "No"}</span>
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Stripe Key Exists:</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(config.stripeKeyExists)}
                        <span className="text-white">{config.stripeKeyExists ? "Yes" : "No"}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Key Prefix:</span>
                      <code className="text-white bg-gray-700 px-2 py-1 rounded text-sm">{config.stripeKeyPrefix}</code>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Mode:</span>
                      <Badge className={`${getModeColor(config.isLiveMode)} text-white`}>
                        {config.isLiveMode ? "Live" : config.isTestMode ? "Test" : "Unknown"}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Environment:</span>
                      <span className="text-white">{config.environment}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Last Checked:</span>
                      <span className="text-white text-sm">{lastChecked}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Configuration Error</AlertTitle>
                <AlertDescription>Failed to load Stripe configuration</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Environment Detection */}
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-purple-400" />
              <CardTitle className="text-white">Environment Detection</CardTitle>
            </div>
            <CardDescription>Check if preview vs production environment is causing issues</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {environmentInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Current Environment:</span>
                    <Badge variant={environmentInfo.isProduction ? "default" : "secondary"}>
                      {environmentInfo.isProduction ? "Production" : "Preview/Development"}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Vercel Environment:</span>
                    <span className="text-white">{environmentInfo.vercelEnv || "Not detected"}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Node Environment:</span>
                    <span className="text-white">{environmentInfo.nodeEnv}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Stripe Webhook URL:</span>
                    <span className="text-white text-sm truncate">{environmentInfo.webhookUrl}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Expected Session Type:</span>
                    <Badge variant={config?.isLiveMode ? "destructive" : "secondary"}>
                      {config?.isLiveMode ? "cs_live_..." : "cs_test_..."}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {environmentInfo && !environmentInfo.isProduction && config?.isLiveMode && (
              <Alert className="border-amber-500/30 bg-amber-500/10">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                <AlertTitle className="text-amber-400">Environment Mismatch Detected!</AlertTitle>
                <AlertDescription className="text-amber-300">
                  You're using <strong>live Stripe keys</strong> in a <strong>preview environment</strong>. This can
                  cause session lookup failures if your checkout sessions are being created with test keys.
                  <br />
                  <br />
                  <strong>Recommendations:</strong>
                  <ul className="list-disc ml-4 mt-2 space-y-1">
                    <li>Use test keys (sk_test_...) in preview environments</li>
                    <li>Use live keys (sk_live_...) only in production</li>
                    <li>Check your Vercel environment variables configuration</li>
                    <li>Ensure webhook endpoints match your environment</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Session Debug */}
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-amber-400" />
              <CardTitle className="text-white">Session Debug</CardTitle>
            </div>
            <CardDescription>Debug a specific Stripe checkout session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter session ID (cs_test_... or cs_live_...)"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
              <Button
                onClick={copySessionId}
                variant="outline"
                size="sm"
                className="border-gray-600 bg-transparent"
                disabled={!sessionId}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <Button
              onClick={debugSession}
              disabled={debugLoading || !sessionId.trim()}
              className="w-full bg-amber-600 hover:bg-amber-700 text-black"
            >
              {debugLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Debugging Session...
                </>
              ) : (
                <>
                  <Bug className="h-4 w-4 mr-2" />
                  Debug Session
                </>
              )}
            </Button>

            {debugResult && (
              <div className="mt-4 space-y-4">
                <Separator className="bg-gray-600" />

                <div className="flex items-center justify-between">
                  <h4 className="text-white font-medium">Debug Results</h4>
                  <Button
                    onClick={copyDebugResult}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 bg-transparent"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>

                {debugResult.error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Debug Failed</AlertTitle>
                    <AlertDescription>{debugResult.error}</AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-green-500/30 bg-green-500/10">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <AlertTitle className="text-green-400">Debug Successful</AlertTitle>
                    <AlertDescription className="text-green-300">
                      Session information retrieved successfully
                    </AlertDescription>
                  </Alert>
                )}

                {debugResult.recommendation && (
                  <Alert className="border-blue-500/30 bg-blue-500/10">
                    <Info className="h-4 w-4 text-blue-400" />
                    <AlertTitle className="text-blue-400">Recommendation</AlertTitle>
                    <AlertDescription className="text-blue-300">{debugResult.recommendation}</AlertDescription>
                  </Alert>
                )}

                {debugResult.configurationSteps && (
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h5 className="text-white font-medium mb-2">Configuration Steps:</h5>
                    <ol className="list-decimal list-inside space-y-1 text-gray-300 text-sm">
                      {debugResult.configurationSteps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                <details className="bg-gray-700/50 rounded-lg">
                  <summary className="p-4 cursor-pointer text-white font-medium">View Raw Debug Data</summary>
                  <pre className="p-4 text-xs text-gray-300 overflow-auto max-h-60 bg-gray-800/50">
                    {JSON.stringify(debugResult, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Common Issues & Solutions */}
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-white">Common Issues & Solutions</CardTitle>
            </div>
            <CardDescription>Troubleshoot common Stripe configuration problems</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
              <h4 className="text-amber-400 font-medium mb-2">Test/Live Mode Mismatch</h4>
              <p className="text-amber-300 text-sm mb-3">
                This occurs when your Stripe API key mode doesn't match the session type you're trying to access.
              </p>
              <ul className="text-amber-300/80 text-sm space-y-1 ml-4 list-disc">
                <li>Test keys (sk_test_...) can only access test sessions (cs_test_...)</li>
                <li>Live keys (sk_live_...) can only access live sessions (cs_live_...)</li>
                <li>Check your STRIPE_SECRET_KEY environment variable</li>
                <li>Ensure you're using the correct session ID for your environment</li>
              </ul>
            </div>

            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <h4 className="text-red-400 font-medium mb-2">Session Not Found (404)</h4>
              <p className="text-red-300 text-sm mb-3">The session ID cannot be found in your Stripe account.</p>
              <ul className="text-red-300/80 text-sm space-y-1 ml-4 list-disc">
                <li>Verify the session ID is correct and complete</li>
                <li>Check if the session belongs to the correct Stripe account</li>
                <li>Sessions expire after 24 hours</li>
                <li>Ensure test/live mode consistency</li>
              </ul>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-blue-400 font-medium mb-2">API Connection Issues</h4>
              <p className="text-blue-300 text-sm mb-3">Problems connecting to the Stripe API.</p>
              <ul className="text-blue-300/80 text-sm space-y-1 ml-4 list-disc">
                <li>Verify your Stripe API key is valid and active</li>
                <li>Check network connectivity</li>
                <li>Ensure API key has the necessary permissions</li>
                <li>Check for any Stripe service outages</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
