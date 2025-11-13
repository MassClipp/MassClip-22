"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, CheckCircle2, XCircle } from "lucide-react"

export default function DebugTrialDetectionPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [debugData, setDebugData] = useState<any>(null)

  const runDiagnostics = async () => {
    if (!user) return

    setLoading(true)
    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/debug/trial-detection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      })

      const data = await response.json()
      setDebugData(data)
    } catch (error) {
      console.error("Error running diagnostics:", error)
      setDebugData({ error: error instanceof Error ? error.message : "Unknown error" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      runDiagnostics()
    }
  }, [user])

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-zinc-400">Please log in to view trial diagnostics</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Trial Detection Diagnostics</h1>
          <p className="text-zinc-400 mt-2">Debug information for Facelessprenuer trial eligibility</p>
        </div>
        <Button onClick={runDiagnostics} disabled={loading} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading && !debugData && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      )}

      {debugData && (
        <div className="space-y-4">
          {/* User Info */}
          <Card className="p-6 bg-zinc-900 border-zinc-800">
            <h2 className="text-xl font-semibold text-white mb-4">User Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-zinc-400">User ID</p>
                <p className="text-white font-mono text-sm">{debugData.userId}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Email</p>
                <p className="text-white text-sm">{debugData.email}</p>
              </div>
            </div>
          </Card>

          {/* Stripe Customer Data */}
          <Card className="p-6 bg-zinc-900 border-zinc-800">
            <h2 className="text-xl font-semibold text-white mb-4">Stripe Customer Data</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Stripe Customer ID</span>
                <span className="text-white font-mono text-sm">{debugData.stripeCustomerId || "None"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Has Stripe Customer Record</span>
                {debugData.stripeCustomerId ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400" />
                )}
              </div>
            </div>
          </Card>

          {/* Subscription History */}
          <Card className="p-6 bg-zinc-900 border-zinc-800">
            <h2 className="text-xl font-semibold text-white mb-4">Subscription History</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Total Subscriptions Found</span>
                <span className="text-white font-bold">{debugData.subscriptionHistory?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Ever Had Facelessprenuer</span>
                {debugData.hasEverHadFacelessprenuer ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Current Active Subscription</span>
                <span className="text-white">{debugData.currentSubscription?.status || "None"}</span>
              </div>
            </div>

            {debugData.subscriptionHistory && debugData.subscriptionHistory.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-white mb-3">All Subscriptions</h3>
                <div className="space-y-2">
                  {debugData.subscriptionHistory.map((sub: any, index: number) => (
                    <div key={index} className="p-3 bg-zinc-800 rounded border border-zinc-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-cyan-400 font-medium">{sub.plan}</span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            sub.status === "active"
                              ? "bg-green-500/20 text-green-400"
                              : sub.status === "canceled"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-zinc-500/20 text-zinc-400"
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-zinc-400">Price ID</p>
                          <p className="text-white font-mono text-xs truncate">{sub.priceId}</p>
                        </div>
                        <div>
                          <p className="text-zinc-400">Created</p>
                          <p className="text-white text-xs">{new Date(sub.created * 1000).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Trial Eligibility */}
          <Card className="p-6 bg-zinc-900 border-zinc-800">
            <h2 className="text-xl font-semibold text-white mb-4">Trial Eligibility Result</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-zinc-800 rounded">
                <span className="text-lg text-zinc-300">Should Show Trial?</span>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-white">{debugData.shouldShowTrial ? "YES" : "NO"}</span>
                  {debugData.shouldShowTrial ? (
                    <CheckCircle2 className="h-6 w-6 text-green-400" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-400" />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-800 rounded">
                <span className="text-lg text-zinc-300">Price ID to Use</span>
                <span className="text-white font-mono text-sm">{debugData.priceIdToUse}</span>
              </div>
            </div>
          </Card>

          {/* Firestore Flags */}
          <Card className="p-6 bg-zinc-900 border-zinc-800">
            <h2 className="text-xl font-semibold text-white mb-4">Firestore Flags (Legacy)</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">freeUsers.hasUsedFreeTrial</span>
                <span className="text-white">{String(debugData.firestoreFlags?.hasUsedFreeTrial)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">freeUsers.hasEverPurchasedFacelessprenuer</span>
                <span className="text-white">{String(debugData.firestoreFlags?.hasEverPurchasedFacelessprenuer)}</span>
              </div>
            </div>
          </Card>

          {/* Debug Logs */}
          {debugData.logs && (
            <Card className="p-6 bg-zinc-900 border-zinc-800">
              <h2 className="text-xl font-semibold text-white mb-4">Debug Logs</h2>
              <div className="space-y-1 text-sm font-mono">
                {debugData.logs.map((log: string, index: number) => (
                  <p key={index} className="text-zinc-400">
                    {log}
                  </p>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
