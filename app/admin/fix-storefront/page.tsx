"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

export default function FixStorefrontPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (user?.uid) {
      fetchStatus()
    }
  }, [user, refreshKey])

  const fetchStatus = async () => {
    try {
      const [userRes, domainRes] = await Promise.all([
        fetch("/api/debug/user-doc"),
        fetch("/api/custom-domain/debug-domain"),
      ])

      const userData = await userRes.json()
      const domainData = await domainRes.json()

      setStatus({
        storefrontActive: userData.storefrontActive,
        customDomain: domainData.domain,
        domainStatus: domainData.status,
        domainId: domainData.domainId,
      })
    } catch (error) {
      console.error("[v0] Error fetching status:", error)
      toast.error("Failed to fetch status")
    }
  }

  const fixCustomDomainStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/fix-custom-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: status.customDomain,
          domainId: status.domainId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update custom domain")
      }

      toast.success("Custom domain status updated to active!")
      setRefreshKey((prev) => prev + 1)
    } catch (error: any) {
      console.error("[v0] Error fixing custom domain:", error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleStorefrontActive = async () => {
    setLoading(true)
    try {
      const newStatus = !status.storefrontActive

      const response = await fetch("/api/admin/toggle-storefront", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to toggle storefront")
      }

      toast.success(`Storefront ${newStatus ? "activated" : "deactivated"}!`)
      setRefreshKey((prev) => prev + 1)
    } catch (error: any) {
      console.error("[v0] Error toggling storefront:", error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Please log in to use this tool</p>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Fix Storefront Issues</h1>
        <p className="text-muted-foreground">Admin tool to fix custom domain and storefront status issues</p>
      </div>

      <div className="space-y-6">
        {/* Storefront Active Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Storefront Active Status
              {status?.storefrontActive ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </CardTitle>
            <CardDescription>Controls whether your storefront is accessible to the public</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Current Status</p>
                <p className="text-sm text-muted-foreground">{status?.storefrontActive ? "Online" : "Offline"}</p>
              </div>
              <Button
                onClick={toggleStorefrontActive}
                disabled={loading || !status}
                variant={status?.storefrontActive ? "destructive" : "default"}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {status?.storefrontActive ? "Set Offline" : "Set Online"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Custom Domain Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Custom Domain Status
              {status?.domainStatus === "active" ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </CardTitle>
            <CardDescription>Fix custom domain status if it&apos;s showing as removed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status?.customDomain ? (
              <>
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Domain</p>
                    <p className="text-sm font-mono">{status.customDomain}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Current Status</p>
                    <p className="text-sm">
                      <span
                        className={`px-2 py-1 rounded-md ${
                          status.domainStatus === "active"
                            ? "bg-green-500/20 text-green-700 dark:text-green-400"
                            : "bg-red-500/20 text-red-700 dark:text-red-400"
                        }`}
                      >
                        {status.domainStatus}
                      </span>
                    </p>
                  </div>
                </div>

                {status.domainStatus !== "active" && (
                  <Button onClick={fixCustomDomainStatus} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Fix Domain Status (Set to Active)
                  </Button>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No custom domain found</p>
            )}
          </CardContent>
        </Card>

        {/* Refresh Button */}
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setRefreshKey((prev) => prev + 1)} disabled={loading}>
            Refresh Status
          </Button>
        </div>
      </div>
    </div>
  )
}
