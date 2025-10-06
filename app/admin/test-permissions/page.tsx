"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, XCircle, AlertCircle, Play } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface TestResult {
  name: string
  status: "success" | "error" | "warning"
  message: string
  data?: any
}

export default function TestPermissionsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])

  const runAllTests = async () => {
    if (!user) {
      setResults([
        {
          name: "Authentication",
          status: "error",
          message: "Not authenticated. Please log in first.",
        },
      ])
      return
    }

    setLoading(true)
    setResults([])
    const testResults: TestResult[] = []

    try {
      // Test 1: Check user authentication
      testResults.push(await testUserAuth())

      // Test 2: Check trial status
      testResults.push(await testTrialStatus())

      // Test 3: Check membership record
      testResults.push(await testMembershipRecord())

      // Test 4: Check bundle limits
      testResults.push(await testBundleLimits())

      // Test 5: Check video per bundle limits
      testResults.push(await testVideoLimits())

      // Test 6: Check platform fee
      testResults.push(await testPlatformFee())

      // Test 7: Test Vex AI permissions
      testResults.push(await testVexPermissions())

      // Test 8: Test trial expiration cron
      testResults.push(await testTrialExpirationCron())

      setResults(testResults)
    } catch (error) {
      console.error("Test suite error:", error)
      testResults.push({
        name: "Test Suite",
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      })
      setResults(testResults)
    } finally {
      setLoading(false)
    }
  }

  const testUserAuth = async (): Promise<TestResult> => {
    try {
      if (!user) {
        throw new Error("Not authenticated")
      }
      return {
        name: "User Authentication",
        status: "success",
        message: `Authenticated as ${user.email}`,
        data: { uid: user.uid, email: user.email },
      }
    } catch (error) {
      return {
        name: "User Authentication",
        status: "error",
        message: error instanceof Error ? error.message : "Authentication failed",
      }
    }
  }

  const testTrialStatus = async (): Promise<TestResult> => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch("/api/user/trial-status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error("Failed to fetch trial status")
      const data = await response.json()
      return {
        name: "Trial Status",
        status: data.isOnTrial ? "success" : "warning",
        message: data.isOnTrial ? `Trial active: ${data.daysRemaining} days remaining` : "No active trial",
        data,
      }
    } catch (error) {
      return {
        name: "Trial Status",
        status: "error",
        message: error instanceof Error ? error.message : "Failed to check trial status",
      }
    }
  }

  const testMembershipRecord = async (): Promise<TestResult> => {
    try {
      const response = await fetch(`/api/debug/check-membership?userId=${user?.uid}`)
      if (!response.ok) throw new Error("Failed to fetch membership")
      const data = await response.json()
      return {
        name: "Membership Record",
        status: data.exists ? "success" : "warning",
        message: data.exists ? `Membership found: ${data.data.plan} (${data.data.status})` : "No membership record",
        data: data.data,
      }
    } catch (error) {
      return {
        name: "Membership Record",
        status: "error",
        message: error instanceof Error ? error.message : "Failed to check membership",
      }
    }
  }

  const testBundleLimits = async (): Promise<TestResult> => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch("/api/user/check-bundle-limits?type=create", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error("Failed to check bundle limits")
      const data = await response.json()

      const isUnlimited = data.maxAllowed === null || data.maxAllowed === Number.POSITIVE_INFINITY
      return {
        name: "Bundle Limits",
        status: "success",
        message: isUnlimited
          ? "Unlimited bundles (Creator Pro)"
          : `${data.currentCount}/${data.maxAllowed} bundles used`,
        data,
      }
    } catch (error) {
      return {
        name: "Bundle Limits",
        status: "error",
        message: error instanceof Error ? error.message : "Failed to check bundle limits",
      }
    }
  }

  const testVideoLimits = async (): Promise<TestResult> => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch("/api/user/check-bundle-limits?type=content", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error("Failed to check video limits")
      const data = await response.json()

      const isUnlimited = data.maxAllowed === null || data.maxAllowed === Number.POSITIVE_INFINITY
      return {
        name: "Videos Per Bundle",
        status: "success",
        message: isUnlimited ? "Unlimited videos per bundle (Creator Pro)" : `${data.maxAllowed} videos per bundle`,
        data,
      }
    } catch (error) {
      return {
        name: "Videos Per Bundle",
        status: "error",
        message: error instanceof Error ? error.message : "Failed to check video limits",
      }
    }
  }

  const testPlatformFee = async (): Promise<TestResult> => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch("/api/membership-status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error("Failed to check platform fee")
      const data = await response.json()

      const expectedFee = data.plan === "creator_pro" || data.status === "trialing" ? 10 : 20
      const actualFee = data.features.platformFeePercentage

      return {
        name: "Platform Fee",
        status: actualFee === expectedFee ? "success" : "error",
        message: `Platform fee: ${actualFee}% (expected: ${expectedFee}%)`,
        data: { plan: data.plan, status: data.status, platformFeePercentage: actualFee },
      }
    } catch (error) {
      return {
        name: "Platform Fee",
        status: "error",
        message: error instanceof Error ? error.message : "Failed to check platform fee",
      }
    }
  }

  const testVexPermissions = async (): Promise<TestResult> => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch("/api/vex/get-bundle-limits", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error("Failed to check Vex permissions")
      const data = await response.json()

      const isUnlimited = data.bundlesLimit === null || data.bundlesLimit === Number.POSITIVE_INFINITY
      return {
        name: "Vex AI Permissions",
        status: "success",
        message: isUnlimited ? "Vex recognizes Creator Pro permissions" : `Vex sees ${data.bundlesLimit} bundle limit`,
        data,
      }
    } catch (error) {
      return {
        name: "Vex AI Permissions",
        status: "error",
        message: error instanceof Error ? error.message : "Failed to check Vex permissions",
      }
    }
  }

  const testTrialExpirationCron = async (): Promise<TestResult> => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch("/api/trial/check-expired", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error("Failed to test trial expiration")
      const data = await response.json()

      return {
        name: "Trial Expiration Cron",
        status: "success",
        message: `Cron job working: ${data.expiredCount} expired trials processed`,
        data,
      }
    } catch (error) {
      return {
        name: "Trial Expiration Cron",
        status: "error",
        message: error instanceof Error ? error.message : "Failed to test cron job",
      }
    }
  }

  const getStatusIcon = (status: "success" | "error" | "warning") => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: "success" | "error" | "warning") => {
    const colors = {
      success: "bg-green-500/10 text-green-500 border-green-500/20",
      error: "bg-red-500/10 text-red-500 border-red-500/20",
      warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    }
    return (
      <Badge variant="outline" className={colors[status]}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Permissions Test Suite</h1>
          <p className="text-zinc-400">
            Comprehensive testing of trial permissions, bundle limits, and Creator Pro features
          </p>
          {!user && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-500 text-sm">⚠️ Not authenticated. Please log in to run tests.</p>
            </div>
          )}
        </div>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Run All Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={runAllTests}
              disabled={loading || !user}
              className="w-full bg-white text-black hover:bg-zinc-200"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Run All Tests
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Test Results</h2>
            {results.map((result, index) => (
              <Card key={index} className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <CardTitle className="text-white text-lg">{result.name}</CardTitle>
                    </div>
                    {getStatusBadge(result.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-zinc-300">{result.message}</p>
                  {result.data && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-zinc-400 hover:text-zinc-300">View Details</summary>
                      <pre className="mt-2 p-3 bg-black rounded-lg overflow-x-auto text-zinc-400">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-green-500">
                    {results.filter((r) => r.status === "success").length}
                  </div>
                  <div className="text-sm text-zinc-400">Passed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-yellow-500">
                    {results.filter((r) => r.status === "warning").length}
                  </div>
                  <div className="text-sm text-zinc-400">Warnings</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-red-500">
                    {results.filter((r) => r.status === "error").length}
                  </div>
                  <div className="text-sm text-zinc-400">Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
