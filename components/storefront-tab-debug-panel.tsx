"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, XCircle } from "lucide-react"

interface TabDebugInfo {
  id: string
  name: string
  type: string
  enabled: boolean
  order: number
  productsCount?: number
}

interface DebugPanelProps {
  userId: string
}

export function StorefrontTabDebugPanel({ userId }: DebugPanelProps) {
  const [tabs, setTabs] = useState<TabDebugInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTabs = async () => {
      try {
        const response = await fetch(`/api/storefront-tabs/${userId}`)
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`)
        }
        const data = await response.json()
        setTabs(data.tabs || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchTabs()
  }, [userId])

  const standardTabs = ["free_content", "premium_content", "ebooks"]
  const customTabs = tabs.filter((tab) => !standardTabs.includes(tab.type))
  const enabledCustomTabs = customTabs.filter((tab) => tab.enabled)

  return (
    <Card className="fixed bottom-4 right-4 z-50 p-4 bg-black/95 border-yellow-500/50 max-w-md backdrop-blur-sm max-h-[80vh] overflow-y-auto">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          <h3 className="text-sm font-semibold text-yellow-500">Tab Debug Panel</h3>
        </div>

        {loading && <p className="text-xs text-zinc-400">Loading tabs...</p>}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
            <p className="text-xs text-red-400">Error: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-3 text-xs">
            <div>
              <p className="text-zinc-400 mb-1">Total tabs in database: {tabs.length}</p>
              <p className="text-zinc-400 mb-1">Custom tabs: {customTabs.length}</p>
              <p className="text-zinc-400">Enabled custom tabs: {enabledCustomTabs.length}</p>
            </div>

            <div className="space-y-2">
              <p className="text-white font-medium">All Tabs:</p>
              {tabs.map((tab) => (
                <div key={tab.id} className="bg-zinc-900/50 border border-zinc-700 rounded p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{tab.name}</span>
                    {tab.enabled ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                        <XCircle className="w-3 h-3 mr-1" />
                        Disabled
                      </Badge>
                    )}
                  </div>
                  <p className="text-zinc-500 text-[10px]">Type: {tab.type}</p>
                  <p className="text-zinc-500 text-[10px]">Order: {tab.order}</p>
                  {tab.productsCount !== undefined && (
                    <p className="text-zinc-500 text-[10px]">Products: {tab.productsCount}</p>
                  )}
                </div>
              ))}
            </div>

            {enabledCustomTabs.length === 0 && customTabs.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                <p className="text-yellow-400 text-[10px]">⚠️ Custom tabs exist but none are enabled</p>
              </div>
            )}

            {enabledCustomTabs.length > 0 && (
              <div className="bg-green-500/10 border border-green-500/20 rounded p-2">
                <p className="text-green-400 text-[10px]">
                  ✓ {enabledCustomTabs.length} custom tab(s) should be visible
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
