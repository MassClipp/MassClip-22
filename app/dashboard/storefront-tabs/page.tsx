"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Plus, GripVertical, Settings, Lock } from "lucide-react"
import { toast } from "sonner"
import type { StorefrontTab } from "@/lib/types"

export default function StorefrontTabsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [tabs, setTabs] = useState<StorefrontTab[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [membershipPlan, setMembershipPlan] = useState<string>("free")

  useEffect(() => {
    if (user) {
      fetchTabs()
      fetchMembership()
    }
  }, [user])

  const fetchMembership = async () => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch("/api/membership-status", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setMembershipPlan(data.membership?.plan || "free")
      }
    } catch (error) {
      console.error("Error fetching membership:", error)
    }
  }

  const fetchTabs = async () => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch("/api/storefront-tabs", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setTabs(data.tabs)
      }
    } catch (error) {
      console.error("Error fetching tabs:", error)
      toast.error("Failed to load tabs")
    } finally {
      setLoading(false)
    }
  }

  const saveTabs = async () => {
    setSaving(true)
    try {
      const token = await user?.getIdToken()
      const response = await fetch("/api/storefront-tabs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tabs }),
      })

      if (response.ok) {
        toast.success("Tabs updated successfully")
      } else {
        toast.error("Failed to update tabs")
      }
    } catch (error) {
      console.error("Error saving tabs:", error)
      toast.error("Failed to save tabs")
    } finally {
      setSaving(false)
    }
  }

  const toggleTab = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) return

    if (["free_content", "premium_content", "ebooks"].includes(tab.type)) {
      toast.error("Cannot disable standard content tabs")
      return
    }

    if (membershipPlan === "free" && !tab.enabled) {
      toast.error("Upgrade to Faceless Pro to enable additional tabs")
      return
    }

    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, enabled: !t.enabled } : t)))
  }

  const isProUser = membershipPlan === "faceless_pro" || membershipPlan === "facelessprenuer"
  const isFacelessprenuer = membershipPlan === "facelessprenuer"

  const standardTabs = tabs.filter((t) =>
    ["free_content", "premium_content", "ebooks", "community", "merch", "affiliates"].includes(t.type),
  )
  const customTabs = tabs.filter((t) => t.type === "custom")

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light mb-2">Storefront Tabs</h1>
            <p className="text-zinc-400">Customize what appears on your storefront</p>
          </div>
          <Button onClick={saveTabs} disabled={saving} className="bg-white text-black hover:bg-zinc-200">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-medium mb-4">Standard Tabs</h2>
            <div className="grid gap-4">
              {standardTabs.map((tab) => {
                const isDefaultTab = ["free_content", "premium_content", "ebooks"].includes(tab.type)
                const canManageProducts = tab.enabled && !isDefaultTab

                return (
                  <div
                    key={tab.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <GripVertical className="w-5 h-5 text-zinc-600" />
                      <div className="flex-1">
                        <h3 className="font-medium">{tab.name}</h3>
                        <p className="text-sm text-zinc-400">
                          {isDefaultTab ? "Always visible" : "Toggle to show on storefront"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {canManageProducts && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/storefront-tabs/${tab.id}/products`)}
                          className="border-zinc-700 text-white hover:bg-zinc-800"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Manage Products
                        </Button>
                      )}
                      <Switch checked={tab.enabled} onCheckedChange={() => toggleTab(tab.id)} disabled={isDefaultTab} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium">Custom Tabs</h2>
              {isFacelessprenuer ? (
                <Button variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800 bg-transparent">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom Tab
                </Button>
              ) : (
                <Button
                  variant="outline"
                  disabled
                  className="border-zinc-700 text-zinc-500 cursor-not-allowed relative group bg-transparent"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Add Custom Tab
                  <div className="absolute -top-12 right-0 bg-zinc-800 text-white text-xs px-3 py-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Upgrade to Facelessprenuer
                  </div>
                </Button>
              )}
            </div>

            {customTabs.length === 0 ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-8 text-center">
                <p className="text-zinc-400">No custom tabs yet</p>
                {!isFacelessprenuer && (
                  <p className="text-zinc-500 text-sm mt-2">Upgrade to Facelessprenuer to add custom tabs</p>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {customTabs.map((tab) => (
                  <div
                    key={tab.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <GripVertical className="w-5 h-5 text-zinc-600" />
                      <div className="flex-1">
                        <h3 className="font-medium">{tab.name}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/storefront-tabs/${tab.id}/products`)}
                        className="border-zinc-700 text-white hover:bg-zinc-800"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Manage Products
                      </Button>
                      <Switch checked={tab.enabled} onCheckedChange={() => toggleTab(tab.id)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
