"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface DebugData {
  userId: string
  rawFirestoreData: {
    freeUser: any
    bundleSlots: any
    bundleCount: number
    bundles: Array<{
      id: string
      title: string
      createdAt: any
      contentItems: number
    }>
  }
  processedData: {
    tierInfo: any
    bundleSlots: any
  }
  calculations: {
    baseFreeLimit: number
    actualBundlesLimit: number
    difference: number
    shouldBe: string
  }
}

export default function UserBundleDataDebugPage() {
  const { user } = useAuth()
  const [debugData, setDebugData] = useState<DebugData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchDebugData = async () => {
    if (!user?.uid) return

    setLoading(true)
    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/debug/user-bundle-data", {
        headers: { Authorization: `Bearer ${idToken}` },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setDebugData(data)
    } catch (error) {
      console.error("Debug fetch error:", error)
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.uid) {
      fetchDebugData()
    }
  }, [user?.uid])

  if (!user) {
    return <div className="p-8">Please log in to view debug information</div>
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Bundle Data Debug</h1>
        <Button onClick={fetchDebugData} disabled={loading}>
          {loading ? "Loading..." : "Refresh Data"}
        </Button>
      </div>

      {debugData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Issue Analysis
                <Badge variant={debugData.calculations.difference > 0 ? "destructive" : "default"}>
                  {debugData.calculations.difference > 0 ? "PROBLEM FOUND" : "OK"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded">
                  <div className="text-sm text-blue-600 font-medium">Base Free Limit</div>
                  <div className="text-2xl font-bold text-blue-800">{debugData.calculations.baseFreeLimit}</div>
                </div>
                <div className="p-4 bg-red-50 rounded">
                  <div className="text-sm text-red-600 font-medium">Actual Limit (What Vex Sees)</div>
                  <div className="text-2xl font-bold text-red-800">{debugData.calculations.actualBundlesLimit}</div>
                </div>
                <div className="p-4 bg-orange-50 rounded">
                  <div className="text-sm text-orange-600 font-medium">Difference</div>
                  <div className="text-2xl font-bold text-orange-800">+{debugData.calculations.difference}</div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <div className="text-sm font-medium mb-2">What it should be:</div>
                <div className="text-lg">{debugData.calculations.shouldBe}</div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Raw Firestore Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">freeUsers Document:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(debugData.rawFirestoreData.freeUser, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium mb-2">userBundleSlots Document:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(debugData.rawFirestoreData.bundleSlots, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Bundles Count: {debugData.rawFirestoreData.bundleCount}</h4>
                  <div className="space-y-1">
                    {debugData.rawFirestoreData.bundles.map((bundle) => (
                      <div key={bundle.id} className="text-sm p-2 bg-gray-50 rounded">
                        <strong>{bundle.title}</strong> - {bundle.contentItems} items
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Processed Service Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">getUserTierInfo() Result:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(debugData.processedData.tierInfo, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium mb-2">getUserBundleSlots() Result:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(debugData.processedData.bundleSlots, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
