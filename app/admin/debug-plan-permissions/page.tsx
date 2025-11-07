"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

interface PlanPermissions {
  plan: string
  priceId: string
  features: {
    unlimitedDownloads: boolean
    premiumContent: boolean
    noWatermark: boolean
    prioritySupport: boolean
    platformFeePercentage: number
    maxVideosPerBundle: number | null
    maxBundles: number | null
    maxFolders: number | null
    canCreateSubfolders: boolean
    canAnalyzeTranscripts: boolean
    canCreateBundles: boolean
  }
}

export default function DebugPlanPermissionsPage() {
  const [loading, setLoading] = useState(false)
  const [facelessProPermissions, setFacelessProPermissions] = useState<PlanPermissions | null>(null)
  const [facelessPrenuerPermissions, setFacelessPrenuerPermissions] = useState<PlanPermissions | null>(null)
  const [error, setError] = useState<string | null>(null)

  const testPermissions = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/test-plan-permissions")
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`)
      }
      const data = await response.json()
      setFacelessProPermissions(data.facelessPro)
      setFacelessPrenuerPermissions(data.facelessprenuer)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const renderFeature = (label: string, value: boolean | number | null) => {
    if (typeof value === "boolean") {
      return (
        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm">{label}</span>
          {value ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
        </div>
      )
    }
    return (
      <div className="flex items-center justify-between py-2 border-b">
        <span className="text-sm">{label}</span>
        <Badge variant="outline">{value === null ? "Unlimited" : value}</Badge>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Plan Permissions Debug</h1>
        <p className="text-muted-foreground">
          Test and verify the exact permissions granted by each plan after purchase
        </p>
      </div>

      <Button onClick={testPermissions} disabled={loading} className="mb-6">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Testing Permissions...
          </>
        ) : (
          "Test Both Plans"
        )}
      </Button>

      {error && (
        <Card className="mb-6 border-red-500">
          <CardContent className="pt-6">
            <p className="text-red-500">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Faceless Pro */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Faceless Pro</CardTitle>
              <Badge>$29/month</Badge>
            </div>
            <CardDescription>{facelessProPermissions?.priceId || "Price ID not loaded"}</CardDescription>
          </CardHeader>
          <CardContent>
            {facelessProPermissions ? (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm mb-4 text-muted-foreground">FEATURES</h3>
                {renderFeature("Unlimited Downloads", facelessProPermissions.features.unlimitedDownloads)}
                {renderFeature("Premium Content", facelessProPermissions.features.premiumContent)}
                {renderFeature("No Watermark", facelessProPermissions.features.noWatermark)}
                {renderFeature("Priority Support", facelessProPermissions.features.prioritySupport)}
                {renderFeature("Platform Fee", `${facelessProPermissions.features.platformFeePercentage}%` as any)}
                {renderFeature("Max Videos Per Bundle", facelessProPermissions.features.maxVideosPerBundle)}
                {renderFeature("Max Bundles", facelessProPermissions.features.maxBundles)}
                {renderFeature("Max Folders", facelessProPermissions.features.maxFolders)}
                {renderFeature("Can Create Subfolders", facelessProPermissions.features.canCreateSubfolders)}
                <h3 className="font-semibold text-sm mt-6 mb-4 text-muted-foreground">VEX AI CAPABILITIES</h3>
                {renderFeature("Can Analyze Transcripts", facelessProPermissions.features.canAnalyzeTranscripts)}
                {renderFeature("Can Create Bundles (via Vex)", facelessProPermissions.features.canCreateBundles)}
              </div>
            ) : (
              <p className="text-muted-foreground">Click "Test Both Plans" to load permissions</p>
            )}
          </CardContent>
        </Card>

        {/* Facelessprenuer */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Facelessprenuer</CardTitle>
              <Badge variant="secondary">$39/month</Badge>
            </div>
            <CardDescription>{facelessPrenuerPermissions?.priceId || "Price ID not loaded"}</CardDescription>
          </CardHeader>
          <CardContent>
            {facelessPrenuerPermissions ? (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm mb-4 text-muted-foreground">FEATURES</h3>
                {renderFeature("Unlimited Downloads", facelessPrenuerPermissions.features.unlimitedDownloads)}
                {renderFeature("Premium Content", facelessPrenuerPermissions.features.premiumContent)}
                {renderFeature("No Watermark", facelessPrenuerPermissions.features.noWatermark)}
                {renderFeature("Priority Support", facelessPrenuerPermissions.features.prioritySupport)}
                {renderFeature("Platform Fee", `${facelessPrenuerPermissions.features.platformFeePercentage}%` as any)}
                {renderFeature("Max Videos Per Bundle", facelessPrenuerPermissions.features.maxVideosPerBundle)}
                {renderFeature("Max Bundles", facelessPrenuerPermissions.features.maxBundles)}
                {renderFeature("Max Folders", facelessPrenuerPermissions.features.maxFolders)}
                {renderFeature("Can Create Subfolders", facelessPrenuerPermissions.features.canCreateSubfolders)}
                <h3 className="font-semibold text-sm mt-6 mb-4 text-muted-foreground">VEX AI CAPABILITIES</h3>
                {renderFeature("Can Analyze Transcripts", facelessPrenuerPermissions.features.canAnalyzeTranscripts)}
                {renderFeature("Can Create Bundles (via Vex)", facelessPrenuerPermissions.features.canCreateBundles)}
              </div>
            ) : (
              <p className="text-muted-foreground">Click "Test Both Plans" to load permissions</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Differences */}
      {facelessProPermissions && facelessPrenuerPermissions && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Key Differences</CardTitle>
            <CardDescription>Understanding what separates the two plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Faceless Pro ($29/month)</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Limited to 5 bundles, 15 videos per bundle, 3 folders</li>
                    <li>20% platform fee on sales</li>
                    <li>Basic Vex AI - file metadata & folder organization ONLY</li>
                    <li>Cannot analyze transcripts via Vex</li>
                    <li>Cannot create bundles via Vex AI (manual creation only)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Facelessprenuer ($39/month)</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Unlimited bundles, videos, and folders</li>
                    <li>10% platform fee on sales</li>
                    <li>Full Vex AI - bundle creation & transcript analysis</li>
                    <li>Can analyze transcripts to suggest bundles</li>
                    <li>Can create bundles automatically via Vex AI</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
