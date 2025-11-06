"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, XCircle, RefreshCw, AlertCircle } from "lucide-react"

interface DebugData {
  // User info
  userId: string
  userEmail: string | null

  // Membership document from Firebase
  membershipDoc: {
    exists: boolean
    plan?: string
    status?: string
    isActive?: boolean
    stripeCustomerId?: string
    stripeSubscriptionId?: string
    currentPeriodEnd?: string
    priceId?: string
    cancelAtPeriodEnd?: boolean
    features?: any
  }

  // Stripe subscription data
  stripeSubscription: {
    exists: boolean
    status?: string
    priceId?: string
    currentPeriodEnd?: string
    cancelAtPeriodEnd?: boolean
    items?: any[]
  }

  // Price ID checks
  priceIdChecks: {
    currentPriceId: string | null
    facelessProPriceIds: string[]
    facelessprenuerPriceIds: string[]
    isFacelessPro: boolean
    isFacelessprenuer: boolean
  }

  // API responses
  membershipStatusAPI: any
  userPlanHook: any

  // Permissions
  permissions: {
    unlimitedDownloads: boolean
    premiumContent: boolean
    noWatermark: boolean
    prioritySupport: boolean
    platformFeePercentage: number
    maxVideosPerBundle: number | null
    maxBundles: number | null
    maxFolders: number | null
  }

  // Folder usage tracking
  folderUsage: {
    currentFolderCount: number
    maxFolders: number | null
    isAtLimit: boolean
  }
}

export default function DebugFacelessProPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [debugData, setDebugData] = useState<DebugData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchDebugData()
    }
  }, [user])

  const fetchDebugData = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/debug-faceless-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      setDebugData(data)
    } catch (err: any) {
      console.error("Error fetching debug data:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to view debug information</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Faceless Pro Debug</h1>
          <p className="text-muted-foreground">Comprehensive membership and permissions diagnostics</p>
        </div>
        <Button onClick={fetchDebugData} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="flex items-center text-red-500">
              <AlertCircle className="mr-2 h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && !debugData && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      {debugData && (
        <>
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <InfoRow label="User ID" value={debugData.userId} />
              <InfoRow label="Email" value={debugData.userEmail || "N/A"} />
            </CardContent>
          </Card>

          {/* Price ID Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Price ID Analysis</CardTitle>
              <CardDescription>Checking if current price ID matches Faceless Pro configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-medium">Current Price ID</h3>
                <code className="rounded bg-muted px-2 py-1 text-sm">
                  {debugData.priceIdChecks.currentPriceId || "None"}
                </code>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">Faceless Pro Price IDs (Expected)</h3>
                <div className="space-y-1">
                  {debugData.priceIdChecks.facelessProPriceIds.map((id) => (
                    <div key={id} className="flex items-center gap-2">
                      <code className="rounded bg-muted px-2 py-1 text-sm">{id}</code>
                      {id === debugData.priceIdChecks.currentPriceId && (
                        <Badge variant="default" className="text-xs">
                          MATCH
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">Facelessprenuer Price IDs (Expected)</h3>
                <div className="space-y-1">
                  {debugData.priceIdChecks.facelessprenuerPriceIds.map((id) => (
                    <div key={id} className="flex items-center gap-2">
                      <code className="rounded bg-muted px-2 py-1 text-sm">{id}</code>
                      {id === debugData.priceIdChecks.currentPriceId && (
                        <Badge variant="default" className="text-xs">
                          MATCH
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                <StatusRow label="Is Faceless Pro" value={debugData.priceIdChecks.isFacelessPro} />
                <StatusRow label="Is Facelessprenuer" value={debugData.priceIdChecks.isFacelessprenuer} />
              </div>
            </CardContent>
          </Card>

          {/* Firebase Membership Document */}
          <Card>
            <CardHeader>
              <CardTitle>Firebase Membership Document</CardTitle>
              <CardDescription>Data stored in memberships collection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <StatusRow label="Document Exists" value={debugData.membershipDoc.exists} />
              {debugData.membershipDoc.exists && (
                <>
                  <InfoRow label="Plan" value={debugData.membershipDoc.plan || "N/A"} />
                  <InfoRow label="Status" value={debugData.membershipDoc.status || "N/A"} />
                  <StatusRow label="Is Active" value={debugData.membershipDoc.isActive || false} />
                  <InfoRow label="Stripe Customer ID" value={debugData.membershipDoc.stripeCustomerId || "N/A"} />
                  <InfoRow
                    label="Stripe Subscription ID"
                    value={debugData.membershipDoc.stripeSubscriptionId || "N/A"}
                  />
                  <InfoRow label="Price ID" value={debugData.membershipDoc.priceId || "N/A"} />
                  <InfoRow label="Current Period End" value={debugData.membershipDoc.currentPeriodEnd || "N/A"} />
                  <StatusRow label="Cancel At Period End" value={debugData.membershipDoc.cancelAtPeriodEnd || false} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Stripe Subscription */}
          <Card>
            <CardHeader>
              <CardTitle>Stripe Subscription</CardTitle>
              <CardDescription>Live data from Stripe API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <StatusRow label="Subscription Exists" value={debugData.stripeSubscription.exists} />
              {debugData.stripeSubscription.exists && (
                <>
                  <InfoRow label="Status" value={debugData.stripeSubscription.status || "N/A"} />
                  <InfoRow label="Price ID" value={debugData.stripeSubscription.priceId || "N/A"} />
                  <InfoRow label="Current Period End" value={debugData.stripeSubscription.currentPeriodEnd || "N/A"} />
                  <StatusRow
                    label="Cancel At Period End"
                    value={debugData.stripeSubscription.cancelAtPeriodEnd || false}
                  />
                  {debugData.stripeSubscription.items && debugData.stripeSubscription.items.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-medium">Subscription Items</h4>
                      <pre className="overflow-auto rounded bg-muted p-3 text-xs">
                        {JSON.stringify(debugData.stripeSubscription.items, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* API Responses */}
          <Card>
            <CardHeader>
              <CardTitle>API Responses</CardTitle>
              <CardDescription>What the membership-status API returns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="mb-2 text-sm font-medium">Membership Status API</h4>
                  <pre className="overflow-auto rounded bg-muted p-3 text-xs">
                    {JSON.stringify(debugData.membershipStatusAPI, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card>
            <CardHeader>
              <CardTitle>Current Permissions</CardTitle>
              <CardDescription>What features the user has access to</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <StatusRow label="Unlimited Downloads" value={debugData.permissions.unlimitedDownloads} />
                <StatusRow label="Premium Content" value={debugData.permissions.premiumContent} />
                <StatusRow label="No Watermark" value={debugData.permissions.noWatermark} />
                <StatusRow label="Priority Support" value={debugData.permissions.prioritySupport} />
                <InfoRow label="Platform Fee" value={`${debugData.permissions.platformFeePercentage}%`} />
                <InfoRow
                  label="Max Videos Per Bundle"
                  value={debugData.permissions.maxVideosPerBundle?.toString() || "Unlimited"}
                />
                <InfoRow label="Max Bundles" value={debugData.permissions.maxBundles?.toString() || "Unlimited"} />
                <InfoRow label="Max Folders" value={debugData.permissions.maxFolders?.toString() || "Unlimited"} />
              </div>
            </CardContent>
          </Card>

          {/* Folder Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Folder Usage</CardTitle>
              <CardDescription>Current folder count vs limit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <InfoRow label="Current Folder Count" value={debugData.folderUsage.currentFolderCount.toString()} />
                <InfoRow
                  label="Max Folders Allowed"
                  value={debugData.folderUsage.maxFolders?.toString() || "Unlimited"}
                />
                <StatusRow label="At Folder Limit" value={debugData.folderUsage.isAtLimit} />
                {debugData.folderUsage.isAtLimit && (
                  <div className="rounded-lg border border-red-500 bg-red-500/10 p-4">
                    <p className="text-sm text-red-500">
                      ⚠️ User has reached their folder limit. They should not be able to create more folders.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-sm">{value}</span>
    </div>
  )
}

function StatusRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      {value ? (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-green-500">Yes</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm font-medium text-red-500">No</span>
        </div>
      )}
    </div>
  )
}
