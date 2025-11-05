"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useUserPlan } from "@/hooks/use-user-plan"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function BundlesPage() {
  const { user } = useAuth()
  const { features, displayName, loading } = useUserPlan()
  const [bundles, setBundles] = useState<any[]>([])
  const [loadingBundles, setLoadingBundles] = useState(true)

  useEffect(() => {
    async function fetchBundles() {
      if (!user) return

      try {
        const response = await fetch("/api/bundles")
        const data = await response.json()
        setBundles(data.bundles || [])
      } catch (error) {
        console.error("[v0] Error fetching bundles:", error)
      } finally {
        setLoadingBundles(false)
      }
    }

    fetchBundles()
  }, [user])

  const bundleCount = bundles.length
  const bundleLimit = features.maxBundles
  const bundleLimitDisplay = bundleLimit === null ? "∞" : bundleLimit

  console.log("[v0] BundlesPage - Plan:", displayName, "Bundles:", bundleCount, "Limit:", bundleLimit)

  if (loading || loadingBundles) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            Bundles {bundleCount}/{bundleLimitDisplay}
          </h1>
          <p className="text-muted-foreground mt-2">Create and manage premium content packages for your audience</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Bundle
        </Button>
      </div>

      {bundles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-semibold mb-2">No Bundles Yet</h2>
          <p className="text-muted-foreground mb-6">Create your first premium content bundle to get started</p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Bundle
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bundles.map((bundle) => (
            <div key={bundle.id} className="border rounded-lg p-6">
              <h3 className="font-semibold">{bundle.title}</h3>
              <p className="text-sm text-muted-foreground">{bundle.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
