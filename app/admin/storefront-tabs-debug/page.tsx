"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"

export default function StorefrontTabsDebug() {
  const { user } = useAuth()
  const [debugData, setDebugData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchDebugData = async () => {
    if (!user) return

    setLoading(true)
    try {
      const token = await user.getIdToken()

      // Fetch tabs from main route
      console.log("[v0] Debug: Fetching from /api/storefront-tabs")
      const mainResponse = await fetch("/api/storefront-tabs", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const mainData = await mainResponse.json()
      console.log("[v0] Debug: Main route response:", mainData)

      // Fetch tabs from user-specific route
      console.log(`[v0] Debug: Fetching from /api/storefront-tabs/${user.uid}`)
      const userResponse = await fetch(`/api/storefront-tabs/${user.uid}`)
      const userData = await userResponse.json()
      console.log("[v0] Debug: User-specific route response:", userData)

      setDebugData({
        uid: user.uid,
        mainRoute: {
          status: mainResponse.status,
          data: mainData,
        },
        userRoute: {
          status: userResponse.status,
          data: userData,
        },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("[v0] Debug: Error fetching data:", error)
      setDebugData({
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const testSave = async () => {
    if (!user) return

    setLoading(true)
    try {
      const token = await user.getIdToken()

      const testData = {
        tabs: [
          { id: "free_content", type: "free_content", name: "Free Content", enabled: true, order: 0 },
          { id: "premium_content", type: "premium_content", name: "Premium Content", enabled: true, order: 1 },
          { id: "ebooks", type: "ebooks", name: "eBooks", enabled: true, order: 2 },
          {
            id: "community",
            type: "community",
            name: "Community",
            enabled: true, // <-- ENABLED
            order: 3,
          },
          { id: "merch", type: "merch", name: "Merch", enabled: false, order: 4 },
          { id: "affiliates", type: "affiliates", name: "Affiliates", enabled: false, order: 5 },
        ],
        externalProducts: [],
      }

      console.log("[v0] Debug: Saving test data:", testData)

      const response = await fetch("/api/storefront-tabs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(testData),
      })

      const result = await response.json()
      console.log("[v0] Debug: Save response:", result)

      // Refetch data after save
      setTimeout(() => fetchDebugData(), 1000)
    } catch (error) {
      console.error("[v0] Debug: Error saving:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchDebugData()
    }
  }, [user])

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-light mb-2">Storefront Tabs Debug</h1>
          <p className="text-zinc-400">Diagnose tab saving and loading issues</p>
        </div>

        <div className="flex gap-3">
          <Button onClick={fetchDebugData} disabled={loading || !user} className="bg-white text-black">
            {loading ? "Loading..." : "Refresh Data"}
          </Button>
          <Button onClick={testSave} disabled={loading || !user} variant="outline">
            Test Save (Enable Community Tab)
          </Button>
        </div>

        {!user && (
          <div className="border border-yellow-500/50 bg-yellow-500/10 p-4 rounded">
            <p className="text-yellow-500">Please log in to use this debug tool</p>
          </div>
        )}

        {debugData && (
          <div className="space-y-4">
            <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900">
              <h2 className="text-xl font-medium mb-3">Debug Results</h2>

              <div className="space-y-4 font-mono text-xs">
                <div>
                  <h3 className="text-zinc-400 mb-1">User ID:</h3>
                  <pre className="bg-black p-3 rounded overflow-x-auto">{debugData.uid || "N/A"}</pre>
                </div>

                <div>
                  <h3 className="text-zinc-400 mb-1">Main Route (/api/storefront-tabs) - Used by Dashboard:</h3>
                  <pre className="bg-black p-3 rounded overflow-x-auto">
                    {JSON.stringify(debugData.mainRoute, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="text-zinc-400 mb-1">
                    User Route (/api/storefront-tabs/[userId]) - Used by Storefront:
                  </h3>
                  <pre className="bg-black p-3 rounded overflow-x-auto">
                    {JSON.stringify(debugData.userRoute, null, 2)}
                  </pre>
                </div>

                {debugData.error && (
                  <div className="border border-red-500/50 bg-red-500/10 p-3 rounded">
                    <h3 className="text-red-500 mb-1">Error:</h3>
                    <pre className="text-red-400">{debugData.error}</pre>
                  </div>
                )}

                <div>
                  <h3 className="text-zinc-400 mb-1">Comparison:</h3>
                  <div className="bg-black p-3 rounded space-y-2">
                    <p className="text-white">
                      Community Tab Enabled in Main Route:{" "}
                      <span
                        className={
                          debugData.mainRoute?.data?.tabs?.find((t: any) => t.type === "community")?.enabled
                            ? "text-green-500"
                            : "text-red-500"
                        }
                      >
                        {debugData.mainRoute?.data?.tabs?.find((t: any) => t.type === "community")?.enabled
                          ? "YES"
                          : "NO"}
                      </span>
                    </p>
                    <p className="text-white">
                      Community Tab Enabled in User Route:{" "}
                      <span
                        className={
                          debugData.userRoute?.data?.tabs?.find((t: any) => t.type === "community")?.enabled
                            ? "text-green-500"
                            : "text-red-500"
                        }
                      >
                        {debugData.userRoute?.data?.tabs?.find((t: any) => t.type === "community")?.enabled
                          ? "YES"
                          : "NO"}
                      </span>
                    </p>
                    <p className="text-zinc-400 text-xs mt-2">
                      ⚠️ If these don't match, that's your problem! The storefront uses the User Route.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900">
          <h2 className="text-xl font-medium mb-3">How This Works</h2>
          <div className="space-y-2 text-sm text-zinc-400">
            <p>1. Dashboard page uses GET /api/storefront-tabs (with auth) to load your settings</p>
            <p>2. Dashboard saves changes to POST /api/storefront-tabs (with auth)</p>
            <p>3. Storefront uses GET /api/storefront-tabs/[userId] (public) to display tabs for visitors</p>
            <p className="text-yellow-500 mt-3">
              ⚠️ The issue: Both routes should return the same data from Firebase, but they might not be!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
