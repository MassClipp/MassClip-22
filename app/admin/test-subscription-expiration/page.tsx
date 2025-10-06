"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2, CheckCircle2, XCircle, CreditCard } from "lucide-react"

interface SubscriptionStatus {
  plan: string
  isActive: boolean
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

interface PermissionsCheck {
  bundleLimit: number | null
  videosPerBundle: number | null
  platformFee: number
  canCreateBundles: boolean
}

export default function TestSubscriptionExpirationPage() {
  const { user, idToken } = useAuth()
  const [loading, setLoading] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [permissions, setPermissions] = useState<PermissionsCheck | null>(null)
  const [testResults, setTestResults] = useState<
    Array<{ test: string; status: "pass" | "fail" | "pending"; message: string }>
  >([])

  useEffect(() => {
    if (user && idToken) {
      fetchSubscriptionStatus()
      fetchPermissions()
    }
  }, [user, idToken])

  const fetchSubscriptionStatus = async () => {
    if (!idToken) return

    try {
      const response = await fetch("/api/membership-status", {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const data = await response.json()
      setSubscriptionStatus({
        plan: data.plan,
        isActive: data.isActive,
        status: data.status,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
      })
    } catch (error) {
      console.error("Error fetching subscription status:", error)
    }
  }

  const fetchPermissions = async () => {
    if (!idToken) return

    try {
      const response = await fetch("/api/membership-status", {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const data = await response.json()
      setPermissions({
        bundleLimit: data.features.maxBundles,
        videosPerBundle: data.features.maxVideosPerBundle,
        platformFee: data.features.platformFeePercentage,
        canCreateBundles: data.isActive,
      })
    } catch (error) {
      console.error("Error fetching permissions:", error)
    }
  }

  const runSubscriptionExpirationTest = async () => {
    if (!idToken || !user) return

    setLoading(true)
    setTestResults([])
    const results: Array<{ test: string; status: "pass" | "fail" | "pending"; message: string }> = []

    // Test 1: Create Creator Pro subscription
    results.push({ test: "Create Creator Pro Subscription", status: "pending", message: "Creating..." })
    setTestResults([...results])

    try {
      const createResponse = await fetch("/api/admin/create-test-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          daysUntilExpiration: 3, // 3 days from now
        }),
      })

      if (createResponse.ok) {
        const createData = await createResponse.json()
        results[0] = {
          test: "Create Creator Pro Subscription",
          status: "pass",
          message: `Subscription created, expires ${new Date(createData.currentPeriodEnd).toLocaleString()}`,
        }
      } else {
        const errorData = await createResponse.json()
        results[0] = {
          test: "Create Creator Pro Subscription",
          status: "fail",
          message: `Failed: ${errorData.error || "Unknown error"}`,
        }
      }
      setTestResults([...results])
    } catch (error) {
      results[0] = {
        test: "Create Creator Pro Subscription",
        status: "fail",
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
      setTestResults([...results])
    }

    // Wait for subscription to be created
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Test 2: Verify Creator Pro permissions granted
    results.push({ test: "Verify Creator Pro Permissions", status: "pending", message: "Checking..." })
    setTestResults([...results])

    try {
      const permResponse = await fetch("/api/membership-status", {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const permData = await permResponse.json()

      if (permData.features.maxBundles === null && permData.features.platformFeePercentage === 10) {
        results[1] = {
          test: "Verify Creator Pro Permissions",
          status: "pass",
          message: "Creator Pro permissions active (unlimited bundles, 10% fee)",
        }
      } else {
        results[1] = {
          test: "Verify Creator Pro Permissions",
          status: "fail",
          message: `Unexpected permissions: ${permData.features.maxBundles} bundles, ${permData.features.platformFeePercentage}% fee`,
        }
      }
      setTestResults([...results])
    } catch (error) {
      results[1] = {
        test: "Verify Creator Pro Permissions",
        status: "fail",
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
      setTestResults([...results])
    }

    // Test 3: Set subscription end date to past
    results.push({ test: "Set Subscription End Date to Past", status: "pending", message: "Updating..." })
    setTestResults([...results])

    try {
      const updateResponse = await fetch("/api/admin/update-subscription-date", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId: user.uid,
          currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        }),
      })

      if (updateResponse.ok) {
        results[2] = {
          test: "Set Subscription End Date to Past",
          status: "pass",
          message: "Subscription end date set to 1 day ago",
        }
      } else {
        const errorData = await updateResponse.json()
        results[2] = {
          test: "Set Subscription End Date to Past",
          status: "fail",
          message: `Failed: ${errorData.error || "Unknown error"}`,
        }
      }
      setTestResults([...results])
    } catch (error) {
      results[2] = {
        test: "Set Subscription End Date to Past",
        status: "fail",
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
      setTestResults([...results])
    }

    // Test 4: Verify permissions revoked
    results.push({ test: "Verify Permissions Revoked", status: "pending", message: "Checking..." })
    setTestResults([...results])

    // Wait a moment for the update to propagate
    await new Promise((resolve) => setTimeout(resolve, 2000))

    try {
      const finalPermResponse = await fetch("/api/membership-status", {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const finalPermData = await finalPermResponse.json()

      if (finalPermData.features.maxBundles === 2 && finalPermData.features.platformFeePercentage === 20) {
        results[3] = {
          test: "Verify Permissions Revoked",
          status: "pass",
          message: "Permissions correctly revoked to free tier (2 bundles, 20% fee)",
        }
      } else {
        results[3] = {
          test: "Verify Permissions Revoked",
          status: "fail",
          message: `Permissions not revoked: ${finalPermData.features.maxBundles} bundles, ${finalPermData.features.platformFeePercentage}% fee`,
        }
      }
      setTestResults([...results])
    } catch (error) {
      results[3] = {
        test: "Verify Permissions Revoked",
        status: "fail",
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
      setTestResults([...results])
    }

    // Test 5: Verify subscription status updated
    results.push({ test: "Verify Subscription Status", status: "pending", message: "Checking..." })
    setTestResults([...results])

    try {
      const finalStatusResponse = await fetch("/api/membership-status", {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const finalStatusData = await finalStatusResponse.json()

      if (!finalStatusData.isActive) {
        results[4] = {
          test: "Verify Subscription Status",
          status: "pass",
          message: "Subscription correctly marked as inactive",
        }
      } else {
        results[4] = {
          test: "Verify Subscription Status",
          status: "fail",
          message: "Subscription still shows as active",
        }
      }
      setTestResults([...results])
    } catch (error) {
      results[4] = {
        test: "Verify Subscription Status",
        status: "fail",
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
      setTestResults([...results])
    }

    setLoading(false)
    await fetchSubscriptionStatus()
    await fetchPermissions()
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Please log in to access this test page</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Subscription Expiration Test</h1>
          <p className="text-zinc-400">
            Test that Creator Pro subscriptions expire correctly and permissions are revoked
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Status */}
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Current Subscription Status
            </h2>
            {subscriptionStatus ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Plan:</span>
                  <span>{subscriptionStatus.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Status:</span>
                  <span className={subscriptionStatus.isActive ? "text-green-500" : "text-red-500"}>
                    {subscriptionStatus.status}
                  </span>
                </div>
                {subscriptionStatus.currentPeriodEnd && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">End Date:</span>
                    <span>{new Date(subscriptionStatus.currentPeriodEnd).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-400">Cancel at Period End:</span>
                  <span>{subscriptionStatus.cancelAtPeriodEnd ? "Yes" : "No"}</span>
                </div>
              </div>
            ) : (
              <p className="text-zinc-500">Loading...</p>
            )}
          </Card>

          {/* Current Permissions */}
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Current Permissions
            </h2>
            {permissions ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Bundle Limit:</span>
                  <span>{permissions.bundleLimit === null ? "Unlimited" : permissions.bundleLimit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Videos Per Bundle:</span>
                  <span>{permissions.videosPerBundle === null ? "Unlimited" : permissions.videosPerBundle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Platform Fee:</span>
                  <span>{permissions.platformFee}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Can Create Bundles:</span>
                  <span className={permissions.canCreateBundles ? "text-green-500" : "text-red-500"}>
                    {permissions.canCreateBundles ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-zinc-500">Loading...</p>
            )}
          </Card>
        </div>

        {/* Test Actions */}
        <Card className="bg-zinc-900 border-zinc-800 p-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="flex gap-4">
            <Button
              onClick={runSubscriptionExpirationTest}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                "Run Full Expiration Test"
              )}
            </Button>
            <Button
              onClick={() => {
                fetchSubscriptionStatus()
                fetchPermissions()
              }}
              variant="outline"
            >
              Refresh Status
            </Button>
          </div>
        </Card>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-zinc-800 rounded-lg">
                  {result.status === "pass" && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />}
                  {result.status === "fail" && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                  {result.status === "pending" && (
                    <Loader2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5 animate-spin" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{result.test}</p>
                    <p className="text-sm text-zinc-400">{result.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Summary */}
        {testResults.length > 0 && testResults.every((r) => r.status !== "pending") && (
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-4">Summary</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-green-500">
                  {testResults.filter((r) => r.status === "pass").length}
                </p>
                <p className="text-sm text-zinc-400">Passed</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-red-500">
                  {testResults.filter((r) => r.status === "fail").length}
                </p>
                <p className="text-sm text-zinc-400">Failed</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-zinc-500">
                  {testResults.filter((r) => r.status === "pending").length}
                </p>
                <p className="text-sm text-zinc-400">Pending</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
