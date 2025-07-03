"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Loader2, RefreshCw, Zap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BundleVisibilityReport {
  creatorId: string
  bundlesCollection: any[]
  productBoxesCollection: any[]
  visibility: {
    totalBundles: number
    activeBundles: number
    visibleBundles: number
  }
  issues: string[]
  timestamp: string
}

export default function BundleVisibilityDebugPage() {
  const [creatorId, setCreatorId] = useState("")
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<BundleVisibilityReport | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const { toast } = useToast()

  const generateReport = async () => {
    if (!creatorId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a creator ID",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      console.log(`🔍 [Bundle Debug] Generating report for creator: ${creatorId}`)

      const response = await fetch(`/api/debug/bundle-visibility?creatorId=${encodeURIComponent(creatorId)}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setReport(data)

      toast({
        title: "Success",
        description: "Bundle visibility report generated",
      })
    } catch (error) {
      console.error("❌ [Bundle Debug] Error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate report",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const syncCollections = async () => {
    if (!creatorId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a creator ID",
        variant: "destructive",
      })
      return
    }

    try {
      setSyncLoading(true)
      console.log(`🔧 [Bundle Debug] Syncing collections for creator: ${creatorId}`)

      const response = await fetch("/api/debug/bundle-visibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creatorId,
          action: "sync_collections",
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      toast({
        title: "Success",
        description: `Sync completed: ${result.changes.length} changes made`,
      })

      // Refresh the report
      await generateReport()
    } catch (error) {
      console.error("❌ [Bundle Debug] Sync error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync collections",
        variant: "destructive",
      })
    } finally {
      setSyncLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Bundle Visibility Debugger</h1>
        <p className="text-zinc-400">Diagnose and fix issues with bundle visibility on creator storefronts</p>
      </div>

      {/* Input Section */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Enter Creator Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="creatorId">Creator ID or Username</Label>
            <Input
              id="creatorId"
              value={creatorId}
              onChange={(e) => setCreatorId(e.target.value)}
              placeholder="Enter creator ID or username"
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={generateReport} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>

            <Button
              onClick={syncCollections}
              disabled={syncLoading || !report}
              variant="outline"
              className="border-zinc-700 bg-transparent"
            >
              {syncLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Sync Collections
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Section */}
      {report && (
        <div className="space-y-6">
          {/* Visibility Overview */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>Visibility Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{report.visibility.totalBundles}</div>
                  <div className="text-sm text-zinc-400">Total Bundles</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{report.visibility.activeBundles}</div>
                  <div className="text-sm text-zinc-400">Active Bundles</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{report.visibility.visibleBundles}</div>
                  <div className="text-sm text-zinc-400">Visible on Storefront</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Issues */}
          {report.issues.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  Issues Found
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.issues.map((issue, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-zinc-300">{issue}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bundles Collection */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>Bundles Collection ({report.bundlesCollection.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {report.bundlesCollection.length === 0 ? (
                <p className="text-zinc-400">No bundles found in bundles collection</p>
              ) : (
                <div className="space-y-3">
                  {report.bundlesCollection.map((bundle) => (
                    <div key={bundle.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                      <div>
                        <h4 className="text-white font-medium">{bundle.title}</h4>
                        <p className="text-sm text-zinc-400">ID: {bundle.id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={bundle.active ? "default" : "secondary"}>
                          {bundle.active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant={bundle.hasContentItems ? "default" : "destructive"}>
                          {bundle.hasContentItems ? "Has Content" : "No Content"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Boxes Collection */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>Product Boxes Collection ({report.productBoxesCollection.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {report.productBoxesCollection.length === 0 ? (
                <p className="text-zinc-400">No bundles found in productBoxes collection</p>
              ) : (
                <div className="space-y-3">
                  {report.productBoxesCollection.map((bundle) => (
                    <div key={bundle.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                      <div>
                        <h4 className="text-white font-medium">{bundle.title}</h4>
                        <p className="text-sm text-zinc-400">ID: {bundle.id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={bundle.active ? "default" : "secondary"}>
                          {bundle.active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant={bundle.hasContentItems ? "default" : "destructive"}>
                          {bundle.hasContentItems ? "Has Content" : "No Content"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {report.issues.length === 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Issues Found</h3>
                <p className="text-zinc-400">All bundles appear to be configured correctly</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
