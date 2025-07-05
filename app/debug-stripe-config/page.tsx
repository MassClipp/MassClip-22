"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Info, Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface StripeConfig {
  stripeKeyExists: boolean
  stripeKeyPrefix: string
  isTestMode: boolean
  isLiveMode: boolean
}

export default function DebugStripeConfigPage() {
  const [config, setConfig] = useState<StripeConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState("")
  const [sessionDebug, setSessionDebug] = useState<any>(null)
  const { toast } = useToast()

  const checkStripeConfig = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/stripe-config")
      const data = await response.json()
      setConfig(data)
    } catch (error) {
      console.error("Failed to check Stripe config:", error)
      toast({
        title: "Error",
        description: "Failed to check Stripe configuration",
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

    setLoading(true)
    try {
      const response = await fetch("/api/debug/stripe-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: sessionId.trim() }),
      })

      const data = await response.json()
      setSessionDebug(data)

      if (!response.ok) {
        toast({
          title: "Session Debug Failed",
          description: data.error || "Failed to debug session",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Session Retrieved",
          description: "Session debug information loaded successfully",
        })
      }
    } catch (error) {
      console.error("Failed to debug session:", error)
      toast({
        title: "Error",
        description: "Failed to debug session",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "Content copied to clipboard",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Stripe Configuration Debug</h1>
          <p className="text-gray-400">Diagnose Stripe configuration and session issues</p>
        </div>

        {/* Stripe Configuration Check */}
        <Card className="bg-gray-800/30 border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Info className="h-5 w-5" />
              Stripe Configuration
            </CardTitle>
            <CardDescription>Check your Stripe API key configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={checkStripeConfig} disabled={loading} className="w-full">
              {loading ? "Checking..." : "Check Stripe Config"}
            </Button>

            {config && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Stripe Key Exists:</span>
                  <Badge variant={config.stripeKeyExists ? "default" : "destructive"}>
                    {config.stripeKeyExists ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <AlertCircle className="h-3 w-3 mr-1" />
                    )}
                    {config.stripeKeyExists ? "Yes" : "No"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Key Prefix:</span>
                  <Badge variant="outline" className="font-mono">
                    {config.stripeKeyPrefix}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Mode:</span>
                  <Badge variant={config.isTestMode ? "secondary" : "default"}>
                    {config.isTestMode ? "Test" : config.isLiveMode ? "Live" : "Unknown"}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Debug */}
        <Card className="bg-gray-800/30 border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Session Debug
            </CardTitle>
            <CardDescription>Debug a specific Stripe checkout session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter session ID (cs_test_... or cs_live_...)"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <Button onClick={debugSession} disabled={loading || !sessionId.trim()}>
                {loading ? "Debugging..." : "Debug Session"}
              </Button>
            </div>

            {sessionDebug && (
              <div className="space-y-4">
                {sessionDebug.error ? (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <span className="text-red-400 font-medium">Error</span>
                    </div>
                    <p className="text-red-300 text-sm">{sessionDebug.error}</p>
                    {sessionDebug.details && <p className="text-red-300/80 text-xs mt-1">{sessionDebug.details}</p>}
                  </div>
                ) : (
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-green-400 font-medium">Session Found</span>
                    </div>
                    {sessionDebug.session && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-400">Status:</span>
                          <p className="text-white">{sessionDebug.session.status}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Payment Status:</span>
                          <p className="text-white">{sessionDebug.session.payment_status}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Amount:</span>
                          <p className="text-white">
                            {sessionDebug.session.amount_total
                              ? `${(sessionDebug.session.amount_total / 100).toFixed(2)} ${sessionDebug.session.currency?.toUpperCase()}`
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400">Customer:</span>
                          <p className="text-white">{sessionDebug.session.customer_email || "N/A"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 font-medium">Full Debug Info</span>
                    <Button
                      onClick={() => copyToClipboard(JSON.stringify(sessionDebug, null, 2))}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <pre className="text-xs text-gray-300 overflow-auto max-h-60 bg-gray-900/50 p-3 rounded">
                    {JSON.stringify(sessionDebug, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
