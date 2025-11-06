"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useUserPlan } from "@/hooks/use-user-plan"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react"

interface DebugData {
  // From useUserPlan hook
  hookPlanData: any
  hookIsProUser: boolean

  // From membership API
  apiResponse: any

  // Expected values
  expectedLimits: {
    bundleLimit: number | null
    videosPerBundle: number | null
    platformFee: number
    folders: number | null
  }

  // Actual values being used
  actualLimits: {
    bundleLimit: number | string
    videosPerBundle: number | string
    platformFee: number
  }

  // Anomalies detected
  anomalies: string[]
}

export default function PlanPermissionsDebugPage() {
  const { user } = useAuth()
  const { planData, isProUser, loading } = useUserPlan()
  const [debugData, setDebugData] = useState<DebugData | null>(null)
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (!user || loading) return

    const fetchDebugData = async () => {
      setFetching(true)
      try {
        // Fetch membership status from API
        const response = await fetch("/api/membership-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.uid }),
        })

        const apiData = await response.json()

        // Determine expected limits based on plan
        let expectedLimits = {
          bundleLimit: 5,
          videosPerBundle: 15,
          platformFee: 20,
          folders: 3,
        }

        // Check what plan the API says user is on
        const apiPlan = apiData.plan
        const isApiProUser = apiPlan === "creator_pro" || apiPlan === "facelessprenuer"

        if (isApiProUser) {
          expectedLimits = {
            bundleLimit: null, // unlimited
            videosPerBundle: null, // unlimited
            platformFee: 10,
            folders: null, // unlimited
          }
        }

        // Get actual limits being displayed
        const actualBundleLimit = isProUser ? "Infinity" : 5
        const actualVideosLimit = isProUser ? "Infinity" : 15
        const actualPlatformFee = apiData.features?.platformFeePercentage || 20

        // Detect anomalies
        const anomalies: string[] = []

        // Check if hook's isProUser matches API's plan
        if (isProUser !== isApiProUser) {
          anomalies.push(
            `Hook isProUser (${isProUser}) doesn't match API plan (${apiPlan}). ` +
              `Hook thinks user is ${isProUser ? "Pro" : "Starter"}, but API says ${apiPlan}`,
          )
        }

        // Check if bundle limit is correct
        if (apiPlan === "starter" || apiPlan === "faceless_pro") {
          if (actualBundleLimit === "Infinity") {
            anomalies.push(`Bundle limit shows "Infinity" for ${apiPlan} plan, but should be 5`)
          }
        }

        // Check if videos per bundle is correct
        if (apiPlan === "starter" || apiPlan === "faceless_pro") {
          if (actualVideosLimit === "Infinity") {
            anomalies.push(`Videos per bundle shows "Infinity" for ${apiPlan} plan, but should be 15`)
          }
        }

        // Check platform fee
        if (apiPlan === "starter" || apiPlan === "faceless_pro") {
          if (actualPlatformFee !== 20) {
            anomalies.push(`Platform fee is ${actualPlatformFee}% for ${apiPlan} plan, but should be 20%`)
          }
        } else if (apiPlan === "creator_pro" || apiPlan === "facelessprenuer") {
          if (actualPlatformFee !== 10) {
            anomalies.push(`Platform fee is ${actualPlatformFee}% for ${apiPlan} plan, but should be 10%`)
          }
        }

        // Check if plan names are consistent
        if (planData?.plan && planData.plan !== apiPlan) {
          anomalies.push(`Hook plan (${planData.plan}) doesn't match API plan (${apiPlan})`)
        }

        setDebugData({
          hookPlanData: planData,
          hookIsProUser: isProUser,
          apiResponse: apiData,
          expectedLimits,
          actualLimits: {
            bundleLimit: actualBundleLimit,
            videosPerBundle: actualVideosLimit,
            platformFee: actualPlatformFee,
          },
          anomalies,
        })
      } catch (error) {
        console.error("Error fetching debug data:", error)
      } finally {
        setFetching(false)
      }
    }

    fetchDebugData()
  }, [user, planData, isProUser, loading])

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Plan Permissions Debug</CardTitle>
            <CardDescription>Please log in to view debug information</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (loading || fetching || !debugData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Plan Permissions Debug</CardTitle>
            <CardDescription>Loading debug information...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const hasAnomalies = debugData.anomalies.length > 0

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Plan Permissions Debug</h1>
        <p className="text-muted-foreground">Comprehensive analysis of plan permissions and limits</p>
      </div>

      {/* Anomalies Alert */}
      {hasAnomalies && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" />
              {debugData.anomalies.length} Anomal{debugData.anomalies.length === 1 ? "y" : "ies"} Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {debugData.anomalies.map((anomaly, index) => (
                <li key={index} className="flex items-start gap-2">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-red-700 dark:text-red-300">{anomaly}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {!hasAnomalies && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-5 w-5" />
              No Anomalies Detected
            </CardTitle>
            <CardDescription className="text-green-600 dark:text-green-400">
              All plan permissions are working correctly
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Hook Data */}
      <Card>
        <CardHeader>
          <CardTitle>useUserPlan Hook Data</CardTitle>
          <CardDescription>Data from the client-side hook</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Plan</p>
              <p className="text-lg font-semibold">{debugData.hookPlanData?.plan || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">isProUser</p>
              <Badge variant={debugData.hookIsProUser ? "default" : "secondary"}>
                {debugData.hookIsProUser ? "True" : "False"}
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Full Hook Data</p>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
              {JSON.stringify(debugData.hookPlanData, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* API Response */}
      <Card>
        <CardHeader>
          <CardTitle>Membership API Response</CardTitle>
          <CardDescription>Data from /api/membership-status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Plan</p>
              <p className="text-lg font-semibold">{debugData.apiResponse.plan}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={debugData.apiResponse.isActive ? "default" : "secondary"}>
                {debugData.apiResponse.status}
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Features</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                {debugData.apiResponse.features?.unlimitedDownloads ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Unlimited Downloads</span>
              </div>
              <div className="flex items-center gap-2">
                {debugData.apiResponse.features?.premiumContent ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Premium Content</span>
              </div>
              <div className="flex items-center gap-2">
                {debugData.apiResponse.features?.noWatermark ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>No Watermark</span>
              </div>
              <div className="flex items-center gap-2">
                {debugData.apiResponse.features?.prioritySupport ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Priority Support</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Full API Response</p>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
              {JSON.stringify(debugData.apiResponse, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Limits Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Limits Comparison</CardTitle>
          <CardDescription>Expected vs Actual limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 font-medium text-sm border-b pb-2">
              <div>Limit</div>
              <div>Expected</div>
              <div>Actual</div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>Bundle Limit</div>
              <div>
                {debugData.expectedLimits.bundleLimit === null ? "Unlimited" : debugData.expectedLimits.bundleLimit}
              </div>
              <div
                className={
                  debugData.actualLimits.bundleLimit !== debugData.expectedLimits.bundleLimit &&
                  debugData.expectedLimits.bundleLimit !== null
                    ? "text-red-500 font-semibold"
                    : ""
                }
              >
                {debugData.actualLimits.bundleLimit}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>Videos Per Bundle</div>
              <div>
                {debugData.expectedLimits.videosPerBundle === null
                  ? "Unlimited"
                  : debugData.expectedLimits.videosPerBundle}
              </div>
              <div
                className={
                  debugData.actualLimits.videosPerBundle !== debugData.expectedLimits.videosPerBundle &&
                  debugData.expectedLimits.videosPerBundle !== null
                    ? "text-red-500 font-semibold"
                    : ""
                }
              >
                {debugData.actualLimits.videosPerBundle}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>Platform Fee</div>
              <div>{debugData.expectedLimits.platformFee}%</div>
              <div
                className={
                  debugData.actualLimits.platformFee !== debugData.expectedLimits.platformFee
                    ? "text-red-500 font-semibold"
                    : ""
                }
              >
                {debugData.actualLimits.platformFee}%
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>Folders</div>
              <div>{debugData.expectedLimits.folders === null ? "Unlimited" : debugData.expectedLimits.folders}</div>
              <div>-</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Definitions */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Definitions Reference</CardTitle>
          <CardDescription>What each plan should have</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Faceless Pro (starter) - $29/month</h3>
              <ul className="text-sm space-y-1 ml-4">
                <li>• 3 folders with subfolders</li>
                <li>• 5 bundles max</li>
                <li>• 15 videos per bundle</li>
                <li>• 20% platform fee</li>
                <li>• Basic Vex AI (no transcript analysis)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Facelessprenuer (creator_pro) - $39/month</h3>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Unlimited folders with subfolders</li>
                <li>• Unlimited bundles</li>
                <li>• Unlimited videos per bundle</li>
                <li>• 10% platform fee</li>
                <li>• Full Vex AI with transcript analysis</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
