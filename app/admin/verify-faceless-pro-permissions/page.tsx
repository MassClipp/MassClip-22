"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react"

interface PermissionCheck {
  source: string
  plan: string
  platformFeePercentage: number
  maxVideosPerBundle: number | null
  maxBundles: number | null
  maxFolders: number | null
  canAnalyzeTranscripts: boolean
  canCreateBundles: boolean
  isActive: boolean
}

export default function VerifyFacelessProPermissions() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [checks, setChecks] = useState<PermissionCheck[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchPermissions = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Check 1: membership-status API (GET)
      const statusResponse = await fetch("/api/membership-status")
      const statusData = await statusResponse.json()

      // Check 2: checkSubscription from lib/subscription.ts
      const subscriptionResponse = await fetch("/api/debug/check-subscription")
      const subscriptionData = await subscriptionResponse.json()

      // Check 3: getMembership from lib/memberships-service.ts
      const membershipResponse = await fetch("/api/debug/get-membership")
      const membershipData = await membershipResponse.json()

      setChecks([
        {
          source: "membership-status API",
          plan: statusData.plan || "unknown",
          platformFeePercentage: statusData.features?.platformFeePercentage || 0,
          maxVideosPerBundle: statusData.features?.maxVideosPerBundle,
          maxBundles: statusData.features?.maxBundles,
          maxFolders: statusData.features?.maxFolders,
          canAnalyzeTranscripts: statusData.features?.canAnalyzeTranscripts || false,
          canCreateBundles: statusData.features?.canCreateBundles || false,
          isActive: statusData.isActive || false,
        },
        {
          source: "checkSubscription (subscription.ts)",
          plan: subscriptionData.plan || "unknown",
          platformFeePercentage: subscriptionData.features?.platformFeePercentage || 0,
          maxVideosPerBundle: subscriptionData.features?.maxVideosPerBundle,
          maxBundles: subscriptionData.features?.maxBundles,
          maxFolders: subscriptionData.features?.maxFolders,
          canAnalyzeTranscripts: subscriptionData.features?.canAnalyzeTranscripts || false,
          canCreateBundles: subscriptionData.features?.canCreateBundles || false,
          isActive: subscriptionData.isActive || false,
        },
        {
          source: "getMembership (memberships-service.ts)",
          plan: membershipData.plan || "unknown",
          platformFeePercentage: membershipData.platformFeePercentage || 0,
          maxVideosPerBundle: membershipData.maxVideosPerBundle,
          maxBundles: membershipData.maxBundles,
          maxFolders: membershipData.maxFolders,
          canAnalyzeTranscripts: membershipData.canAnalyzeTranscripts || false,
          canCreateBundles: membershipData.canCreateBundles || false,
          isActive: membershipData.isActive || false,
        },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch permissions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPermissions()
  }, [user])

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to verify permissions</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const expectedFacelessPro = {
    platformFeePercentage: 15,
    maxVideosPerBundle: 25,
    maxBundles: 5,
    maxFolders: 3,
    canAnalyzeTranscripts: false,
    canCreateBundles: false,
  }

  const verifyCheck = (check: PermissionCheck) => {
    if (check.plan !== "faceless_pro") {
      return { valid: null, message: "Not Faceless Pro plan" }
    }

    const issues: string[] = []
    if (check.platformFeePercentage !== expectedFacelessPro.platformFeePercentage) {
      issues.push(
        `Platform fee: ${check.platformFeePercentage}% (expected ${expectedFacelessPro.platformFeePercentage}%)`,
      )
    }
    if (check.maxVideosPerBundle !== expectedFacelessPro.maxVideosPerBundle) {
      issues.push(`Max videos: ${check.maxVideosPerBundle} (expected ${expectedFacelessPro.maxVideosPerBundle})`)
    }
    if (check.maxBundles !== expectedFacelessPro.maxBundles) {
      issues.push(`Max bundles: ${check.maxBundles} (expected ${expectedFacelessPro.maxBundles})`)
    }
    if (check.maxFolders !== expectedFacelessPro.maxFolders) {
      issues.push(`Max folders: ${check.maxFolders} (expected ${expectedFacelessPro.maxFolders})`)
    }

    if (issues.length > 0) {
      return { valid: false, message: issues.join(", ") }
    }

    return { valid: true, message: "All permissions correct!" }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Faceless Pro Permissions Verification</h1>
          <p className="text-muted-foreground mt-2">
            Verify that Faceless Pro permissions are correctly set across all systems
          </p>
        </div>
        <Button onClick={fetchPermissions} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-red-500">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Expected Faceless Pro Permissions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Platform Fee</p>
              <p className="text-2xl font-bold">{expectedFacelessPro.platformFeePercentage}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Videos per Bundle</p>
              <p className="text-2xl font-bold">{expectedFacelessPro.maxVideosPerBundle}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Max Bundles</p>
              <p className="text-2xl font-bold">{expectedFacelessPro.maxBundles}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Max Folders</p>
              <p className="text-2xl font-bold">{expectedFacelessPro.maxFolders}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Transcript Analysis</p>
              <p className="text-2xl font-bold">{expectedFacelessPro.canAnalyzeTranscripts ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bundle Creation</p>
              <p className="text-2xl font-bold">{expectedFacelessPro.canCreateBundles ? "Yes" : "No"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {checks.map((check, index) => {
            const verification = verifyCheck(check)
            return (
              <Card key={index} className={verification.valid === false ? "border-yellow-500" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{check.source}</CardTitle>
                    {verification.valid === true && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    {verification.valid === false && <XCircle className="h-5 w-5 text-yellow-500" />}
                  </div>
                  <CardDescription>
                    <Badge variant={check.isActive ? "default" : "secondary"}>{check.plan}</Badge>
                    {check.isActive && <Badge className="ml-2 bg-green-500">Active</Badge>}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Platform Fee</p>
                      <p className="font-semibold">{check.platformFeePercentage}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Videos/Bundle</p>
                      <p className="font-semibold">{check.maxVideosPerBundle ?? "Unlimited"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Max Bundles</p>
                      <p className="font-semibold">{check.maxBundles ?? "Unlimited"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Max Folders</p>
                      <p className="font-semibold">{check.maxFolders ?? "Unlimited"}</p>
                    </div>
                  </div>
                  {verification.valid !== null && (
                    <div
                      className={`mt-4 rounded-md p-3 text-sm ${
                        verification.valid ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-600"
                      }`}
                    >
                      {verification.message}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
