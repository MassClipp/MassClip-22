"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface DebugData {
  frontend: {
    CONTENT_LIMIT_FREE: number
    userTier: any
    bundles: any[]
    selectedBundle?: any
    existingCount: number
    maxPerBundle: number | null
    remaining: number
  }
  backend: {
    tierInfo: any
    bundleData: any
    currentCount: number
    maxPerBundle: number | null
    remaining: number
  }
}

export default function BundleLimitsDebugPage() {
  const { user } = useAuth()
  const [debugData, setDebugData] = useState<DebugData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedBundleId, setSelectedBundleId] = useState<string>("")

  const runDebug = async () => {
    if (!user?.uid) return

    setLoading(true)
    try {
      const idToken = await user.getIdToken()

      // Get frontend data
      const bundlesResponse = await fetch("/api/creator/bundles", {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const bundlesData = await bundlesResponse.json()

      const tierResponse = await fetch("/api/user/check-bundle-limits?type=content", {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const tierData = await tierResponse.json()

      let selectedBundle = null
      let backendData = null

      if (selectedBundleId && bundlesData.bundles) {
        selectedBundle = bundlesData.bundles.find((b: any) => b.id === selectedBundleId)

        // Get backend debug data for specific bundle
        const backendResponse = await fetch(`/api/debug/bundle-limits/${selectedBundleId}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        })
        backendData = await backendResponse.json()
      }

      const CONTENT_LIMIT_FREE = 10 // From frontend constant
      const existingCount = selectedBundle
        ? (selectedBundle.detailedContentItems?.length ?? selectedBundle.contentItems?.length ?? 0)
        : 0
      const maxPerBundle = tierData.tier === "creator_pro" ? null : CONTENT_LIMIT_FREE
      const remaining = maxPerBundle === null ? Number.POSITIVE_INFINITY : Math.max(0, maxPerBundle - existingCount)

      setDebugData({
        frontend: {
          CONTENT_LIMIT_FREE,
          userTier: tierData,
          bundles: bundlesData.bundles || [],
          selectedBundle,
          existingCount,
          maxPerBundle,
          remaining,
        },
        backend: backendData || {},
      })
    } catch (error) {
      console.error("Debug error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.uid) {
      runDebug()
    }
  }, [user?.uid, selectedBundleId])

  if (!user) {
    return <div className="p-8">Please log in to view debug information</div>
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bundle Limits Debug</h1>
        <Button onClick={runDebug} disabled={loading}>
          {loading ? "Loading..." : "Refresh Debug Data"}
        </Button>
      </div>

      {debugData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Bundle Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Bundle to Debug:</label>
                  <select
                    value={selectedBundleId}
                    onChange={(e) => setSelectedBundleId(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select a bundle...</option>
                    {debugData.frontend.bundles.map((bundle: any) => (
                      <option key={bundle.id} value={bundle.id}>
                        {bundle.title} ({bundle.contentItems?.length || 0} items)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Frontend Calculations
                  <Badge variant="outline">Client Side</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>CONTENT_LIMIT_FREE:</strong>
                    <div className="text-2xl font-bold text-blue-600">{debugData.frontend.CONTENT_LIMIT_FREE}</div>
                  </div>
                  <div>
                    <strong>User Tier:</strong>
                    <div className="text-lg">{debugData.frontend.userTier?.tier || "unknown"}</div>
                  </div>
                  <div>
                    <strong>Existing Count:</strong>
                    <div className="text-2xl font-bold text-green-600">{debugData.frontend.existingCount}</div>
                  </div>
                  <div>
                    <strong>Max Per Bundle:</strong>
                    <div className="text-2xl font-bold text-orange-600">
                      {debugData.frontend.maxPerBundle === null ? "∞" : debugData.frontend.maxPerBundle}
                    </div>
                  </div>
                  <div>
                    <strong>Remaining:</strong>
                    <div className="text-2xl font-bold text-red-600">
                      {debugData.frontend.remaining === Number.POSITIVE_INFINITY ? "∞" : debugData.frontend.remaining}
                    </div>
                  </div>
                  <div>
                    <strong>Total Bundles:</strong>
                    <div className="text-lg">{debugData.frontend.bundles.length}</div>
                  </div>
                </div>

                {debugData.frontend.selectedBundle && (
                  <div className="mt-4 p-4 bg-gray-50 rounded">
                    <h4 className="font-medium mb-2">Selected Bundle Details:</h4>
                    <div className="text-sm space-y-1">
                      <div>
                        <strong>Title:</strong> {debugData.frontend.selectedBundle.title}
                      </div>
                      <div>
                        <strong>Content Items Length:</strong>{" "}
                        {debugData.frontend.selectedBundle.contentItems?.length || 0}
                      </div>
                      <div>
                        <strong>Detailed Items Length:</strong>{" "}
                        {debugData.frontend.selectedBundle.detailedContentItems?.length || 0}
                      </div>
                      <div>
                        <strong>Content Metadata Total:</strong>{" "}
                        {debugData.frontend.selectedBundle.contentMetadata?.totalItems || 0}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Backend Calculations
                  <Badge variant="outline">Server Side</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {debugData.backend.tierInfo ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Tier Max Videos:</strong>
                      <div className="text-2xl font-bold text-blue-600">
                        {debugData.backend.tierInfo.maxVideosPerBundle === null
                          ? "∞"
                          : debugData.backend.tierInfo.maxVideosPerBundle}
                      </div>
                    </div>
                    <div>
                      <strong>Current Count:</strong>
                      <div className="text-2xl font-bold text-green-600">{debugData.backend.currentCount}</div>
                    </div>
                    <div>
                      <strong>Max Per Bundle:</strong>
                      <div className="text-2xl font-bold text-orange-600">
                        {debugData.backend.maxPerBundle === null ? "∞" : debugData.backend.maxPerBundle}
                      </div>
                    </div>
                    <div>
                      <strong>Remaining:</strong>
                      <div className="text-2xl font-bold text-red-600">
                        {debugData.backend.remaining === Number.POSITIVE_INFINITY ? "∞" : debugData.backend.remaining}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">Select a bundle to see backend calculations</div>
                )}

                {debugData.backend.bundleData && (
                  <div className="mt-4 p-4 bg-gray-50 rounded">
                    <h4 className="font-medium mb-2">Backend Bundle Data:</h4>
                    <div className="text-sm space-y-1">
                      <div>
                        <strong>Raw Content Items:</strong> {debugData.backend.bundleData.contentItems?.length || 0}
                      </div>
                      <div>
                        <strong>Unique Set Size:</strong> {debugData.backend.uniqueSetSize || "N/A"}
                      </div>
                      <div>
                        <strong>Detailed Items:</strong>{" "}
                        {debugData.backend.bundleData.detailedContentItems?.length || 0}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Tier Information</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(debugData.frontend.userTier, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
