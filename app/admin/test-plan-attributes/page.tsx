"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, XCircle, Play, AlertTriangle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface PlanAttributes {
  plan: string
  platformFeePercentage: number
  maxBundles: number | null
  maxVideosPerBundle: number | null
  maxFoldersPerBundle: number | null
  unlimitedDownloads: boolean
  premiumContent: boolean
  noWatermark: boolean
  prioritySupport: boolean
}

interface ComparisonResult {
  attribute: string
  expected: any
  actual: any
  matches: boolean
}

const STARTER_ATTRIBUTES: PlanAttributes = {
  plan: "starter",
  platformFeePercentage: 20,
  maxBundles: 5,
  maxVideosPerBundle: 15,
  maxFoldersPerBundle: 3,
  unlimitedDownloads: false,
  premiumContent: false,
  noWatermark: false,
  prioritySupport: false,
}

const CREATOR_VIP_ATTRIBUTES: PlanAttributes = {
  plan: "creator_pro",
  platformFeePercentage: 10,
  maxBundles: null,
  maxVideosPerBundle: null,
  maxFoldersPerBundle: null,
  unlimitedDownloads: true,
  premiumContent: true,
  noWatermark: true,
  prioritySupport: true,
}

export default function TestPlanAttributesPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [actualAttributes, setActualAttributes] = useState<any>(null)
  const [comparison, setComparison] = useState<ComparisonResult[]>([])

  const runTest = async () => {
    if (!user) {
      alert("Please log in first")
      return
    }

    setLoading(true)
    setComparison([])

    try {
      // Fetch membership status
      const token = await user.getIdToken()
      const response = await fetch("/api/membership-status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch membership: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Membership data:", data)

      setCurrentPlan(data.plan)
      setActualAttributes(data.features)

      // Determine expected attributes based on plan
      const expectedAttributes = data.plan === "starter" ? STARTER_ATTRIBUTES : CREATOR_VIP_ATTRIBUTES

      // Compare attributes
      const results: ComparisonResult[] = [
        {
          attribute: "Plan Name",
          expected: expectedAttributes.plan,
          actual: data.plan,
          matches: data.plan === expectedAttributes.plan,
        },
        {
          attribute: "Platform Fee %",
          expected: expectedAttributes.platformFeePercentage,
          actual: data.features?.platformFeePercentage,
          matches: data.features?.platformFeePercentage === expectedAttributes.platformFeePercentage,
        },
        {
          attribute: "Max Bundles",
          expected: expectedAttributes.maxBundles === null ? "Unlimited" : expectedAttributes.maxBundles,
          actual: data.features?.maxBundles === null ? "Unlimited" : data.features?.maxBundles,
          matches: data.features?.maxBundles === expectedAttributes.maxBundles,
        },
        {
          attribute: "Max Videos Per Bundle",
          expected:
            expectedAttributes.maxVideosPerBundle === null ? "Unlimited" : expectedAttributes.maxVideosPerBundle,
          actual: data.features?.maxVideosPerBundle === null ? "Unlimited" : data.features?.maxVideosPerBundle,
          matches: data.features?.maxVideosPerBundle === expectedAttributes.maxVideosPerBundle,
        },
        {
          attribute: "Max Folders Per Bundle",
          expected:
            expectedAttributes.maxFoldersPerBundle === null ? "Unlimited" : expectedAttributes.maxFoldersPerBundle,
          actual: data.features?.maxFoldersPerBundle === null ? "Unlimited" : data.features?.maxFoldersPerBundle,
          matches: data.features?.maxFoldersPerBundle === expectedAttributes.maxFoldersPerBundle,
        },
        {
          attribute: "Unlimited Downloads",
          expected: expectedAttributes.unlimitedDownloads,
          actual: data.features?.unlimitedDownloads,
          matches: data.features?.unlimitedDownloads === expectedAttributes.unlimitedDownloads,
        },
        {
          attribute: "Premium Content",
          expected: expectedAttributes.premiumContent,
          actual: data.features?.premiumContent,
          matches: data.features?.premiumContent === expectedAttributes.premiumContent,
        },
        {
          attribute: "No Watermark",
          expected: expectedAttributes.noWatermark,
          actual: data.features?.noWatermark,
          matches: data.features?.noWatermark === expectedAttributes.noWatermark,
        },
        {
          attribute: "Priority Support",
          expected: expectedAttributes.prioritySupport,
          actual: data.features?.prioritySupport,
          matches: data.features?.prioritySupport === expectedAttributes.prioritySupport,
        },
      ]

      setComparison(results)
    } catch (error) {
      console.error("[v0] Test error:", error)
      alert(error instanceof Error ? error.message : "Test failed")
    } finally {
      setLoading(false)
    }
  }

  const allMatch = comparison.length > 0 && comparison.every((r) => r.matches)
  const hasErrors = comparison.some((r) => !r.matches)

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Plan Attributes Test</h1>
          <p className="text-zinc-400">
            Verify that Starter Plan and Creator VIP users receive the correct plan-specific attributes
          </p>
          {!user && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-500 text-sm">⚠️ Not authenticated. Please log in to run test.</p>
            </div>
          )}
        </div>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Run Attribute Test</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={runTest}
              disabled={loading || !user}
              className="w-full bg-white text-black hover:bg-zinc-200"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Test Current User's Plan Attributes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {currentPlan && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Current Plan</CardTitle>
                <Badge
                  variant="outline"
                  className={
                    currentPlan === "starter"
                      ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                  }
                >
                  {currentPlan === "starter" ? "STARTER PLAN" : "CREATOR VIP"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400">
                Testing attributes for:{" "}
                <span className="text-white font-semibold">
                  {currentPlan === "starter" ? "Starter Plan ($3/month)" : "Creator VIP ($15/month)"}
                </span>
              </p>
            </CardContent>
          </Card>
        )}

        {comparison.length > 0 && (
          <>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Test Results</CardTitle>
                  {allMatch ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      ALL ATTRIBUTES CORRECT
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                      <XCircle className="h-4 w-4 mr-1" />
                      MISMATCHED ATTRIBUTES
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {comparison.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        result.matches ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {result.matches ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                            )}
                            <h3 className="text-white font-semibold">{result.attribute}</h3>
                          </div>
                          <div className="ml-7 space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-500">Expected:</span>
                              <span className="text-white font-mono">
                                {typeof result.expected === "boolean" ? result.expected.toString() : result.expected}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-500">Actual:</span>
                              <span className={`font-mono ${result.matches ? "text-green-400" : "text-red-400"}`}>
                                {typeof result.actual === "boolean" ? result.actual.toString() : result.actual}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {hasErrors && (
              <Card className="bg-red-500/10 border-red-500/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <CardTitle className="text-red-500">Issues Detected</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-red-400 mb-4">
                    The user's plan attributes do not match the expected values. This indicates a problem with:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-red-400 text-sm">
                    <li>Stripe webhook processing (check webhook-processor.ts)</li>
                    <li>Plan assignment logic (check subscription creation)</li>
                    <li>Feature mapping (check STARTER_FEATURES vs PRO_FEATURES)</li>
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Raw Data</CardTitle>
              </CardHeader>
              <CardContent>
                <details className="text-sm">
                  <summary className="cursor-pointer text-zinc-400 hover:text-zinc-300 mb-2">
                    View Full Membership Response
                  </summary>
                  <pre className="p-4 bg-black rounded-lg overflow-x-auto text-zinc-400 text-xs">
                    {JSON.stringify(actualAttributes, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          </>
        )}

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Expected Attributes Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-3">Starter Plan ($3/month)</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Platform Fee:</span>
                    <span className="text-white font-mono">20%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Max Bundles:</span>
                    <span className="text-white font-mono">5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Max Videos/Bundle:</span>
                    <span className="text-white font-mono">15</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Max Folders/Bundle:</span>
                    <span className="text-white font-mono">3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Unlimited Downloads:</span>
                    <span className="text-white font-mono">false</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Premium Content:</span>
                    <span className="text-white font-mono">false</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">No Watermark:</span>
                    <span className="text-white font-mono">false</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Priority Support:</span>
                    <span className="text-white font-mono">false</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-purple-400 mb-3">Creator VIP ($15/month)</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Platform Fee:</span>
                    <span className="text-white font-mono">10%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Max Bundles:</span>
                    <span className="text-white font-mono">Unlimited</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Max Videos/Bundle:</span>
                    <span className="text-white font-mono">Unlimited</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Max Folders/Bundle:</span>
                    <span className="text-white font-mono">Unlimited</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Unlimited Downloads:</span>
                    <span className="text-white font-mono">true</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Premium Content:</span>
                    <span className="text-white font-mono">true</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">No Watermark:</span>
                    <span className="text-white font-mono">true</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Priority Support:</span>
                    <span className="text-white font-mono">true</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
