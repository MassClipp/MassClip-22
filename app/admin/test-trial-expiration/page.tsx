"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react"

interface TrialStatus {
  isActive: boolean
  trialEndDate: Date | null
  daysRemaining: number
  plan: string
  status: string
}

interface PermissionsCheck {
  bundleLimit: number | null
  videosPerBundle: number | null
  platformFee: number
  canCreateBundles: boolean
}

export default function TestTrialExpirationPage() {
  const { user, idToken } = useAuth()
  const [loading, setLoading] = useState(false)
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [permissions, setPermissions] = useState<PermissionsCheck | null>(null)
  const [testResults, setTestResults] = useState<
    Array<{ test: string; status: "pass" | "fail" | "pending"; message: string }>
  >([])
  const [cronRunning, setCronRunning] = useState(false)

  useEffect(() => {
    if (user && idToken) {
      fetchTrialStatus()
      fetchPermissions()
    }
  }, [user, idToken])

  const fetchTrialStatus = async () => {
    if (!idToken) return

    try {
      const response = await fetch("/api/user/trial-status", {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const data = await response.json()
      setTrialStatus({
        isActive: data.isActive,
        trialEndDate: data.trialEndDate ? new Date(data.trialEndDate) : null,
        daysRemaining: data.daysRemaining,
        plan: data.plan,
        status: data.status,
      })
    } catch (error) {
      console.error("Error fetching trial status:", error)
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

  const runTrialExpirationTest = async () => {
    if (!idToken || !user) return

    setLoading(true)
    setTestResults([])
    const results: Array<{ test: string; status: "pass" | "fail" | "pending"; message: string }> = []

    // Test 1: Check current trial status
    results.push({ test: "Current Trial Status", status: "pending", message: "Checking..." })
    setTestResults([...results])

    try {
      const statusResponse = await fetch("/api/user/trial-status", {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const statusData = await statusResponse.json()

      if (statusData.isActive && statusData.trialEndDate) {
        results[0] = {
          test: "Current Trial Status",
          status: "pass",
          message: `Trial active, expires ${new Date(statusData.trialEndDate).toLocaleString()}`,
        }
      } else {
        results[0] = {
          test: "Current Trial Status",
          status: "fail",
          message: "No active trial found",
        }
      }
      setTestResults([...results])
    } catch (error) {
      results[0] = {
        test: "Current Trial Status",
        status: "fail",
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
      setTestResults([...results])
    }

    // Test 2: Check current permissions (should be Creator Pro)
    results.push({ test: "Current Permissions", status: "pending", message: "Checking..." })
    setTestResults([...results])

    try {
      const permResponse = await fetch("/api/membership-status", {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const permData = await permResponse.json()

      if (permData.features.maxBundles === null && permData.features.platformFeePercentage === 10) {
        results[1] = {
          test: "Current Permissions",
          status: "pass",
          message: "Creator Pro permissions active (unlimited bundles, 10% fee)",
        }
      } else {
        results[1] = {
          test: "Current Permissions",
          status: "fail",
          message: `Unexpected permissions: ${permData.features.maxBundles} bundles, ${permData.features.platformFeePercentage}% fee`,
        }
      }
      setTestResults([...results])
    } catch (error) {
      results[1] = {
        test: "Current Permissions",
        status: "fail",
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
      setTestResults([...results])
    }

    // Test 3: Simulate trial expiration by setting end date to past
    results.push({ test: "Set Trial End Date to Past", status: "pending", message: "Updating..." })
    setTestResults([...results])

    try {
      const updateResponse = await fetch("/api/admin/update-trial-date", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId: user.uid,
          trialEndDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        }),
      })

      if (updateResponse.ok) {
        results[2] = {
          test: "Set Trial End Date to Past",
          status: "pass",
          message: "Trial end date set to 1 day ago",
        }
      } else {
        const errorData = await updateResponse.json()
        results[2] = {
          test: "Set Trial End Date to Past",
          status: "fail",
          message: `Failed: ${errorData.error || "Unknown error"}`,
        }
      }
      setTestResults([...results])
    } catch (error) {
      results[2] = {
        test: "Set Trial End Date to Past",
        status: "fail",
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
      setTestResults([...results])
    }

    // Test 4: Run cron job to check expired trials
    results.push({ test: "Run Expiration Cron Job", status: "pending", message: "Running..." })
    setTestResults([...results])

    try {
      const cronResponse = await fetch("/api/trial/check-expired", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const cronData = await cronResponse.json()

      if (cronResponse.ok && cronData.success) {
        results[3] = {
          test: "Run Expiration Cron Job",
          status: "pass",
          message: `Cron job completed: ${cronData.message}`,
        }
      } else {
        results[3] = {
          test: "Run Expiration Cron Job",
          status: "fail",
          message: `Cron job failed: ${cronData.error || "Unknown error"}`,
        }
      }
      setTestResults([...results])
    } catch (error) {
      results[3] = {
        test: "Run Expiration Cron Job",
        status: "fail",
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
      setTestResults([...results])
    }

    // Test 5: Verify permissions revoked (should be free tier)
    results.push({ test: "Verify Permissions Revoked", status: "pending", message: "Checking..." })
    setTestResults([...results])

    // Wait a moment for the cron job to complete
    await new Promise((resolve) => setTimeout(resolve, 2000))

    try {
      const finalPermResponse = await fetch("/api/membership-status", {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const finalPermData = await finalPermResponse.json()

      if (finalPermData.features.maxBundles === 2 && finalPermData.features.platformFeePercentage === 20) {
        results[4] = {
          test: "Verify Permissions Revoked",
          status: "pass",
          message: "Permissions correctly revoked to free tier (2 bundles, 20% fee)",
        }
      } else {
        results[4] = {
          test: "Verify Permissions Revoked",
          status: "fail",
          message: `Permissions not revoked: ${finalPermData.features.maxBundles} bundles, ${finalPermData.features.platformFeePercentage}% fee`,
        }
      }
      setTestResults([...results])
    } catch (error) {
      results[4] = {
        test: "Verify Permissions Revoked",
        status: "fail",
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
      setTestResults([...results])
    }

    // Test 6: Verify trial status updated
    results.push({ test: "Verify Trial Status Updated", status: "pending", message: "Checking..." })
    setTestResults([...results])

    try {
      const finalStatusResponse = await fetch("/api/user/trial-status", {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const finalStatusData = await finalStatusResponse.json()

      if (!finalStatusData.isActive) {
        results[5] = {
          test: "Verify Trial Status Updated",
          status: "pass",
          message: "Trial status correctly set to inactive",
        }
      } else {
        results[5] = {
          test: "Verify Trial Status Updated",
          status: "fail",
          message: "Trial still shows as active",
        }
      }
      setTestResults([...results])
    } catch (error) {
      results[5] = {
        test: "Verify Trial Status Updated",
        status: "fail",
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
      setTestResults([...results])
    }

    setLoading(false)
    await fetchTrialStatus()
    await fetchPermissions()
  }

  const runCronManually = async () => {
    if (!idToken) return

    setCronRunning(true)
    try {
      const response = await fetch("/api/trial/check-expired", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const data = await response.json()
      alert(`Cron job result: ${data.message || data.error}`)
      await fetchTrialStatus()
      await fetchPermissions()
    } catch (error) {
      alert(`Error running cron: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setCronRunning(false)
    }
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
          <h1 className="text-3xl font-bold mb-2">Trial Expiration Test</h1>
          <p className="text-zinc-400">Test that free trials expire correctly and permissions are revoked</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Status */}
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Current Trial Status
            </h2>
            {trialStatus ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Status:</span>
                  <span className={trialStatus.isActive ? "text-green-500" : "text-red-500"}>
                    {trialStatus.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Plan:</span>
                  <span>{trialStatus.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Days Remaining:</span>
                  <span>{trialStatus.daysRemaining}</span>
                </div>
                {trialStatus.trialEndDate && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">End Date:</span>
                    <span>{trialStatus.trialEndDate.toLocaleString()}</span>
                  </div>
                )}
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
            <Button onClick={runTrialExpirationTest} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                "Run Full Expiration Test"
              )}
            </Button>
            <Button onClick={runCronManually} disabled={cronRunning} variant="outline">
              {cronRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                "Run Cron Job Manually"
              )}
            </Button>
            <Button
              onClick={() => {
                fetchTrialStatus()
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
