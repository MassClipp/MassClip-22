"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, XCircle, Wrench } from "lucide-react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

const PLAN_CONFIGS = {
  starter: {
    plan: "starter",
    features: {
      maxBundles: 5,
      maxVideosPerBundle: 15,
      maxFolders: 3,
      noWatermark: false,
      platformFeePercentage: 20,
      premiumContent: false,
      prioritySupport: false,
      unlimitedDownloads: false,
      isActive: true,
    },
  },
  creator_pro: {
    plan: "creator_pro",
    features: {
      maxBundles: null,
      maxVideosPerBundle: null,
      maxFolders: null,
      noWatermark: true,
      platformFeePercentage: 10,
      premiumContent: true,
      prioritySupport: true,
      unlimitedDownloads: true,
      isActive: true,
    },
  },
}

const PRICE_ID_TO_PLAN: Record<string, keyof typeof PLAN_CONFIGS> = {
  price_1SKKFPDheyb0pkWFBT6lf7V7: "starter",
}

export default function DebugPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [fixing, setFixing] = useState(false)
  const [membershipData, setMembershipData] = useState<any>(null)
  const [webhookEvents, setWebhookEvents] = useState<any[]>([])
  const [issues, setIssues] = useState<string[]>([])

  const fetchDebugData = async () => {
    if (!user) return

    setLoading(true)
    setIssues([])

    try {
      // Fetch membership document from Firestore
      const membershipDoc = await getDoc(doc(db, "memberships", user.uid))

      if (membershipDoc.exists()) {
        const data = membershipDoc.data()
        setMembershipData(data)

        // Analyze issues
        const foundIssues: string[] = []

        const priceId = data.priceId
        if (priceId) {
          const expectedPlan = PRICE_ID_TO_PLAN[priceId]
          if (expectedPlan && data.plan !== expectedPlan) {
            foundIssues.push(`Price ID ${priceId} maps to "${expectedPlan}" plan, but plan field is "${data.plan}"`)
          } else if (!expectedPlan) {
            foundIssues.push(`Unknown price ID: ${priceId}`)
          }
        }

        // Check if features match the plan
        const expectedConfig = PLAN_CONFIGS[data.plan as keyof typeof PLAN_CONFIGS]
        if (expectedConfig && data.features) {
          Object.keys(expectedConfig.features).forEach((key) => {
            const expected = expectedConfig.features[key as keyof typeof expectedConfig.features]
            const actual = data.features[key]

            if (expected !== actual) {
              foundIssues.push(
                `Feature "${key}" should be ${JSON.stringify(expected)} for ${data.plan} plan, but is ${JSON.stringify(actual)}`,
              )
            }
          })
        }

        // Check for missing features
        if (expectedConfig) {
          Object.keys(expectedConfig.features).forEach((key) => {
            if (!(key in data.features)) {
              foundIssues.push(`Missing feature "${key}" for ${data.plan} plan`)
            }
          })
        }

        setIssues(foundIssues)
      } else {
        setMembershipData(null)
        setIssues(["No membership document found in Firestore"])
      }

      // Fetch recent webhook events from Stripe (via API)
      const token = await user.getIdToken()
      const response = await fetch("/api/debug/webhook-events", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setWebhookEvents(data.events || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching debug data:", error)
      setIssues([`Error fetching data: ${error}`])
    } finally {
      setLoading(false)
    }
  }

  const fixMembership = async () => {
    if (!user) return

    setFixing(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/debug/fix-membership", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: user.uid }),
      })

      const result = await response.json()

      if (result.success) {
        // Refresh the debug data
        await fetchDebugData()
        alert("Membership fixed successfully!")
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error("[v0] Error fixing membership:", error)
      alert(`Error: ${error}`)
    } finally {
      setFixing(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchDebugData()
    }
  }, [user])

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-zinc-400">Please log in to view debug information</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
      </div>
    )
  }

  const expectedPlan = membershipData?.priceId ? PRICE_ID_TO_PLAN[membershipData.priceId] : null

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">Membership Debug</h1>
          <p className="text-zinc-400 mt-1">Diagnose membership and webhook issues</p>
        </div>
        <div className="flex gap-2">
          {issues.length > 0 && (
            <Button
              onClick={fixMembership}
              disabled={fixing}
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Wrench className={`h-4 w-4 mr-2 ${fixing ? "animate-spin" : ""}`} />
              Fix Membership Now
            </Button>
          )}
          <Button
            onClick={fetchDebugData}
            disabled={loading}
            variant="outline"
            className="border-zinc-700 bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Issues Summary */}
      {issues.length > 0 && (
        <Card className="bg-red-900/20 border-red-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              {issues.length} Issue{issues.length !== 1 ? "s" : ""} Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {issues.map((issue, index) => (
                <li key={index} className="text-sm text-red-300 flex items-start gap-2">
                  <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {issues.length === 0 && membershipData && (
        <Card className="bg-emerald-900/20 border-emerald-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-400">
              <CheckCircle className="h-5 w-5" />
              No Issues Found
            </CardTitle>
            <CardDescription className="text-emerald-300/80">
              Your membership configuration looks correct
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Current Membership Data */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle>Current Membership Document</CardTitle>
          <CardDescription>Raw data from Firestore</CardDescription>
        </CardHeader>
        <CardContent>
          {membershipData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Plan</p>
                  <Badge variant={membershipData.plan === expectedPlan ? "default" : "destructive"}>
                    {membershipData.plan}
                  </Badge>
                  {expectedPlan && membershipData.plan !== expectedPlan && (
                    <p className="text-xs text-red-400 mt-1">Expected: {expectedPlan}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Status</p>
                  <Badge variant={membershipData.status === "active" ? "default" : "secondary"}>
                    {membershipData.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Price ID</p>
                  <code className="text-xs text-zinc-300 bg-zinc-800 px-2 py-1 rounded">
                    {membershipData.priceId || "N/A"}
                  </code>
                </div>
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Is Active</p>
                  <Badge variant={membershipData.isActive ? "default" : "secondary"}>
                    {membershipData.isActive ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm text-zinc-400 mb-2">Features</p>
                <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
                  {membershipData.features ? (
                    Object.entries(membershipData.features).map(([key, value]) => {
                      const expectedConfig = PLAN_CONFIGS[membershipData.plan as keyof typeof PLAN_CONFIGS]
                      const expectedValue = expectedConfig?.features[key as keyof typeof expectedConfig.features]
                      const isCorrect = expectedValue === value

                      return (
                        <div key={key} className="flex justify-between items-center">
                          <span className="text-sm text-zinc-300">{key}</span>
                          <div className="flex items-center gap-2">
                            <code
                              className={`text-xs px-2 py-1 rounded ${
                                isCorrect ? "bg-emerald-900/30 text-emerald-300" : "bg-red-900/30 text-red-300"
                              }`}
                            >
                              {JSON.stringify(value)}
                            </code>
                            {!isCorrect && expectedValue !== undefined && (
                              <span className="text-xs text-zinc-500">(expected: {JSON.stringify(expectedValue)})</span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-zinc-500">No features found</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm text-zinc-400 mb-2">Full Document (JSON)</p>
                <pre className="bg-zinc-800/50 rounded-lg p-4 text-xs text-zinc-300 overflow-auto max-h-96">
                  {JSON.stringify(membershipData, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-zinc-400">No membership data found</p>
          )}
        </CardContent>
      </Card>

      {/* Expected Configuration */}
      {membershipData && (
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle>Expected Configuration</CardTitle>
            <CardDescription>What the membership SHOULD look like for {membershipData.plan}</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-zinc-800/50 rounded-lg p-4 text-xs text-zinc-300 overflow-auto">
              {JSON.stringify(PLAN_CONFIGS[membershipData.plan as keyof typeof PLAN_CONFIGS] || {}, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Recent Webhook Events */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle>Recent Webhook Events</CardTitle>
          <CardDescription>Last 10 webhook events from Stripe</CardDescription>
        </CardHeader>
        <CardContent>
          {webhookEvents.length > 0 ? (
            <div className="space-y-3">
              {webhookEvents.map((event, index) => (
                <div key={index} className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline">{event.type}</Badge>
                    <span className="text-xs text-zinc-500">{new Date(event.created * 1000).toLocaleString()}</span>
                  </div>
                  <pre className="text-xs text-zinc-400 overflow-auto max-h-48">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-400">No webhook events found</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
