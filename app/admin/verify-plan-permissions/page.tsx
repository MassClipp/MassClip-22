"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, XCircle, Play, AlertTriangle, RefreshCw } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface PlanTest {
  planName: string
  expectedPlan: "starter" | "creator_pro"
  expectedAttributes: {
    platformFeePercentage: number
    maxBundles: number | null
    maxVideosPerBundle: number | null
    maxFolders: number | null
    unlimitedDownloads: boolean
    premiumContent: boolean
    noWatermark: boolean
    prioritySupport: boolean
  }
}

interface TestResult {
  attribute: string
  expected: any
  actual: any
  matches: boolean
  critical: boolean
}

const PLAN_TESTS: PlanTest[] = [
  {
    planName: "Starter Plan",
    expectedPlan: "starter",
    expectedAttributes: {
      platformFeePercentage: 20,
      maxBundles: 5,
      maxVideosPerBundle: 15,
      maxFolders: 3,
      unlimitedDownloads: false,
      premiumContent: false,
      noWatermark: false,
      prioritySupport: false,
    },
  },
  {
    planName: "Creator Pro",
    expectedPlan: "creator_pro",
    expectedAttributes: {
      platformFeePercentage: 10,
      maxBundles: null,
      maxVideosPerBundle: null,
      maxFolders: null,
      unlimitedDownloads: true,
      premiumContent: true,
      noWatermark: true,
      prioritySupport: true,
    },
  },
]

export default function VerifyPlanPermissionsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [rawData, setRawData] = useState<any>(null)

  const runTest = async () => {
    if (!user) {
      alert("Please log in first")
      return
    }

    setLoading(true)
    setTestResults([])
    setRawData(null)

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
      setRawData(data)

      // Find the expected test for this plan
      const expectedTest = PLAN_TESTS.find((test) => test.expectedPlan === data.plan)

      if (!expectedTest) {
        throw new Error(`Unknown plan type: ${data.plan}`)
      }

      // Run comparisons
      const results: TestResult[] = [
        {
          attribute: "Plan Name",
          expected: expectedTest.expectedPlan,
          actual: data.plan,
          matches: data.plan === expectedTest.expectedPlan,
          critical: true,
        },
        {
          attribute: "Platform Fee Percentage",
          expected: expectedTest.expectedAttributes.platformFeePercentage,
          actual: data.features?.platformFeePercentage,
          matches: data.features?.platformFeePercentage === expectedTest.expectedAttributes.platformFeePercentage,
          critical: true,
        },
        {
          attribute: "Max Bundles",
          expected:
            expectedTest.expectedAttributes.maxBundles === null
              ? "Unlimited"
              : expectedTest.expectedAttributes.maxBundles,
          actual: data.features?.maxBundles === null ? "Unlimited" : data.features?.maxBundles,
          matches: data.features?.maxBundles === expectedTest.expectedAttributes.maxBundles,
          critical: true,
        },
        {
          attribute: "Max Videos Per Bundle",
          expected:
            expectedTest.expectedAttributes.maxVideosPerBundle === null
              ? "Unlimited"
              : expectedTest.expectedAttributes.maxVideosPerBundle,
          actual: data.features?.maxVideosPerBundle === null ? "Unlimited" : data.features?.maxVideosPerBundle,
          matches: data.features?.maxVideosPerBundle === expectedTest.expectedAttributes.maxVideosPerBundle,
          critical: true,
        },
        {
          attribute: "Max Folders",
          expected:
            expectedTest.expectedAttributes.maxFolders === null
              ? "Unlimited"
              : expectedTest.expectedAttributes.maxFolders,
          actual: data.features?.maxFolders === null ? "Unlimited" : data.features?.maxFolders,
          matches: data.features?.maxFolders === expectedTest.expectedAttributes.maxFolders,
          critical: false,
        },
        {
          attribute: "Unlimited Downloads",
          expected: expectedTest.expectedAttributes.unlimitedDownloads,
          actual: data.features?.unlimitedDownloads,
          matches: data.features?.unlimitedDownloads === expectedTest.expectedAttributes.unlimitedDownloads,
          critical: true,
        },
        {
          attribute: "Premium Content Access",
          expected: expectedTest.expectedAttributes.premiumContent,
          actual: data.features?.premiumContent,
          matches: data.features?.premiumContent === expectedTest.expectedAttributes.premiumContent,
          critical: false,
        },
        {
          attribute: "No Watermark",
          expected: expectedTest.expectedAttributes.noWatermark,
          actual: data.features?.noWatermark,
          matches: data.features?.noWatermark === expectedTest.expectedAttributes.noWatermark,
          critical: false,
        },
        {
          attribute: "Priority Support",
          expected: expectedTest.expectedAttributes.prioritySupport,
          actual: data.features?.prioritySupport,
          matches: data.features?.prioritySupport === expectedTest.expectedAttributes.prioritySupport,
          critical: false,
        },
      ]

      setTestResults(results)
    } catch (error) {
      console.error("[v0] Test error:", error)
      alert(error instanceof Error ? error.message : "Test failed")
    } finally {
      setLoading(false)
    }
  }

  const allMatch = testResults.length > 0 && testResults.every((r) => r.matches)
  const criticalErrors = testResults.filter((r) => !r.matches && r.critical)
  const minorErrors = testResults.filter((r) => !r.matches && !r.critical)

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Plan Permissions Verification</h1>
          <p className="text-zinc-400">
            Comprehensive test to verify all plan attributes and permissions are correctly assigned for Starter and
            Creator Pro plans
          </p>
          {!user && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-500 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Not authenticated. Please log in to run verification.
              </p>
            </div>
          )}
        </div>

        {/* Test Runner */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Run Verification Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={runTest}
              disabled={loading || !user}
              className="w-full bg-white text-black hover:bg-zinc-200"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Running Verification...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Verify Current User's Plan Permissions
                </>
              )}
            </Button>
            {testResults.length > 0 && (
              <Button
                onClick={runTest}
                disabled={loading}
                variant="outline"
                className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-run Test
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Current Plan Display */}
        {currentPlan && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Detected Plan</CardTitle>
                <Badge
                  variant="outline"
                  className={
                    currentPlan === "starter"
                      ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                  }
                >
                  {currentPlan === "starter" ? "STARTER PLAN" : "CREATOR PRO"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400">
                Testing permissions for:{" "}
                <span className="text-white font-semibold">
                  {currentPlan === "starter" ? "Starter Plan" : "Creator Pro"}
                </span>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Test Results Summary */}
        {testResults.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Verification Summary</CardTitle>
                {allMatch ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    ALL TESTS PASSED
                  </Badge>
                ) : criticalErrors.length > 0 ? (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                    <XCircle className="h-4 w-4 mr-1" />
                    CRITICAL FAILURES
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    MINOR ISSUES
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-zinc-800 rounded-lg">
                  <div className="text-2xl font-bold text-white">{testResults.length}</div>
                  <div className="text-sm text-zinc-400">Total Tests</div>
                </div>
                <div className="p-4 bg-green-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-green-500">{testResults.filter((r) => r.matches).length}</div>
                  <div className="text-sm text-zinc-400">Passed</div>
                </div>
                <div className="p-4 bg-red-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-red-500">{testResults.filter((r) => !r.matches).length}</div>
                  <div className="text-sm text-zinc-400">Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Test Results */}
        {testResults.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Detailed Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      result.matches
                        ? "bg-green-500/5 border-green-500/20"
                        : result.critical
                          ? "bg-red-500/5 border-red-500/20"
                          : "bg-yellow-500/5 border-yellow-500/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {result.matches ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                          ) : result.critical ? (
                            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                          )}
                          <h3 className="text-white font-semibold">{result.attribute}</h3>
                          {result.critical && !result.matches && (
                            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                              CRITICAL
                            </Badge>
                          )}
                        </div>
                        <div className="ml-7 space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500 w-20">Expected:</span>
                            <span className="text-white font-mono">
                              {typeof result.expected === "boolean"
                                ? result.expected.toString()
                                : (result.expected ?? "null")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500 w-20">Actual:</span>
                            <span
                              className={`font-mono ${
                                result.matches ? "text-green-400" : result.critical ? "text-red-400" : "text-yellow-400"
                              }`}
                            >
                              {typeof result.actual === "boolean"
                                ? result.actual.toString()
                                : (result.actual ?? "null")}
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
        )}

        {/* Error Details */}
        {criticalErrors.length > 0 && (
          <Card className="bg-red-500/10 border-red-500/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <CardTitle className="text-red-500">Critical Issues Detected</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-red-400 mb-4">
                {criticalErrors.length} critical permission{criticalErrors.length > 1 ? "s" : ""} failed verification.
                These issues will affect core functionality:
              </p>
              <ul className="list-disc list-inside space-y-2 text-red-400 text-sm">
                {criticalErrors.map((error, i) => (
                  <li key={i}>
                    <strong>{error.attribute}</strong>: Expected {String(error.expected)}, got {String(error.actual)}
                  </li>
                ))}
              </ul>
              <div className="mt-4 p-3 bg-black/30 rounded-lg">
                <p className="text-red-400 text-sm font-semibold mb-2">Possible causes:</p>
                <ul className="list-disc list-inside space-y-1 text-red-400 text-xs">
                  <li>Stripe webhook not processing plan metadata correctly</li>
                  <li>Feature mapping mismatch in memberships-service.ts</li>
                  <li>Plan assignment logic error during subscription creation</li>
                  <li>Database record not updated after plan change</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {minorErrors.length > 0 && (
          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <CardTitle className="text-yellow-500">Minor Issues</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-yellow-400 mb-4">
                {minorErrors.length} non-critical permission{minorErrors.length > 1 ? "s" : ""} failed verification:
              </p>
              <ul className="list-disc list-inside space-y-2 text-yellow-400 text-sm">
                {minorErrors.map((error, i) => (
                  <li key={i}>
                    <strong>{error.attribute}</strong>: Expected {String(error.expected)}, got {String(error.actual)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Raw Data */}
        {rawData && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Raw API Response</CardTitle>
            </CardHeader>
            <CardContent>
              <details className="text-sm">
                <summary className="cursor-pointer text-zinc-400 hover:text-zinc-300 mb-2">
                  View Full Membership Data
                </summary>
                <pre className="p-4 bg-black rounded-lg overflow-x-auto text-zinc-400 text-xs">
                  {JSON.stringify(rawData, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}

        {/* Reference Guide */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Plan Permissions Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {PLAN_TESTS.map((test, index) => (
                <div key={index}>
                  <h3
                    className={`text-lg font-semibold mb-3 ${
                      test.expectedPlan === "starter" ? "text-blue-400" : "text-purple-400"
                    }`}
                  >
                    {test.planName}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Platform Fee:</span>
                      <span className="text-white font-mono">{test.expectedAttributes.platformFeePercentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Max Bundles:</span>
                      <span className="text-white font-mono">
                        {test.expectedAttributes.maxBundles === null ? "Unlimited" : test.expectedAttributes.maxBundles}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Max Videos/Bundle:</span>
                      <span className="text-white font-mono">
                        {test.expectedAttributes.maxVideosPerBundle === null
                          ? "Unlimited"
                          : test.expectedAttributes.maxVideosPerBundle}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Max Folders:</span>
                      <span className="text-white font-mono">
                        {test.expectedAttributes.maxFolders === null ? "Unlimited" : test.expectedAttributes.maxFolders}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Unlimited Downloads:</span>
                      <span className="text-white font-mono">
                        {test.expectedAttributes.unlimitedDownloads.toString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Premium Content:</span>
                      <span className="text-white font-mono">{test.expectedAttributes.premiumContent.toString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">No Watermark:</span>
                      <span className="text-white font-mono">{test.expectedAttributes.noWatermark.toString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Priority Support:</span>
                      <span className="text-white font-mono">{test.expectedAttributes.prioritySupport.toString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
