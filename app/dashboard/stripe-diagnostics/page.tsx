"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StripeSyncTroubleshooter } from "@/components/stripe-sync-troubleshooter"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, RefreshCw, AlertCircle } from "lucide-react"

export default function StripeDiagnosticsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [stripeConfig, setStripeConfig] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const checkStripeConfig = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Check if STRIPE_SECRET_KEY is properly configured
      const response = await fetch("/api/test-stripe-connection", {
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to test Stripe connection")
      }

      const data = await response.json()
      setStripeConfig(data)
    } catch (error) {
      console.error("❌ [Stripe Config] Error:", error)
      setError(error instanceof Error ? error.message : "Failed to check Stripe configuration")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stripe Diagnostics</h1>
        <p className="text-zinc-400 mt-1">Troubleshoot Stripe integration and product synchronization</p>
      </div>

      <Tabs defaultValue="troubleshooter">
        <TabsList>
          <TabsTrigger value="troubleshooter">Sync Troubleshooter</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>
        <TabsContent value="troubleshooter" className="mt-6">
          <StripeSyncTroubleshooter />
        </TabsContent>
        <TabsContent value="config" className="mt-6">
          <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Stripe Configuration</CardTitle>
                  <CardDescription>Check your Stripe API configuration</CardDescription>
                </div>
                <Button onClick={checkStripeConfig} variant="outline" size="sm" className="border-zinc-700">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                    <div>
                      <div className="font-medium text-red-300">Configuration Error</div>
                      <div className="text-sm text-red-300/80 mt-1">{error}</div>
                    </div>
                  </div>
                </div>
              ) : stripeConfig ? (
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-800/50 rounded-lg">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">API Connection</span>
                        <span className={`text-sm ${stripeConfig.connected ? "text-green-400" : "text-red-400"}`}>
                          {stripeConfig.connected ? "Connected" : "Failed"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">API Version</span>
                        <span className="text-sm">{stripeConfig.apiVersion || "Unknown"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Environment</span>
                        <span className="text-sm">{stripeConfig.environment || "Unknown"}</span>
                      </div>
                    </div>
                  </div>

                  {stripeConfig.message && (
                    <div
                      className={`p-4 ${
                        stripeConfig.connected
                          ? "bg-green-900/20 border-green-800/50"
                          : "bg-red-900/20 border-red-800/50"
                      } border rounded-lg`}
                    >
                      <div className="text-sm">
                        {stripeConfig.connected ? (
                          <span className="text-green-300">{stripeConfig.message}</span>
                        ) : (
                          <span className="text-red-300">{stripeConfig.message}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  Click the refresh button to check your Stripe configuration
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
