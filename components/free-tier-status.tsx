"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useFreeTierLimits } from "@/hooks/use-free-tier-limits"
import { Download, Package, Video, DollarSign, Clock } from "lucide-react"

export function FreeTierStatus() {
  const { limits, loading, error, refetch } = useFreeTierLimits()

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
            <div className="h-2 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !limits) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <p className="text-red-600">Failed to load tier information</p>
            <Button onClick={refetch} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const downloadProgress = (limits.downloadsUsed / limits.downloadsLimit) * 100
  const bundleProgress = (limits.bundlesCreated / limits.bundlesLimit) * 100

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="secondary">Free Plan</Badge>
            </CardTitle>
            <CardDescription>Your current usage and limits</CardDescription>
          </div>
          <Button onClick={refetch} variant="ghost" size="sm">
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Downloads */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span className="font-medium">Downloads</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {limits.downloadsUsed} / {limits.downloadsLimit}
            </span>
          </div>
          <Progress value={downloadProgress} className="h-2" />
          {limits.reachedDownloadLimit && <p className="text-sm text-red-600">Monthly download limit reached</p>}
        </div>

        {/* Bundles */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="font-medium">Bundles</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {limits.bundlesCreated} / {limits.bundlesLimit}
            </span>
          </div>
          <Progress value={bundleProgress} className="h-2" />
          {limits.reachedBundleLimit && <p className="text-sm text-red-600">Bundle limit reached</p>}
        </div>

        {/* Other Limits */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{limits.maxVideosPerBundle} videos</p>
              <p className="text-xs text-muted-foreground">per bundle</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{limits.platformFeePercentage}% fee</p>
              <p className="text-xs text-muted-foreground">on sales</p>
            </div>
          </div>
        </div>

        {/* Reset Timer */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Resets in {limits.daysUntilReset} days</p>
            <p className="text-xs text-muted-foreground">Downloads reset monthly</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
