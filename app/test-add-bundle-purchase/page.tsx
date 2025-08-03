"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Package, User, DollarSign, Eye, Download, Calendar, HardDrive } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface BundleInfo {
  id: string
  title: string
  description: string
  price: number
  creatorId: string
  creatorName: string
  fileSize: string
  fileSizeBytes: number | null
  thumbnailUrl: string | null
  quality: string | null
  views: number
  downloads: number
  tags: string[]
  createdAt: string | null
  _raw: any
}

export default function TestAddBundlePurchase() {
  const [bundleId, setBundleId] = useState("0WTyJRYTgRJIHpn6xJfe")
  const [bundleInfo, setBundleInfo] = useState<BundleInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchBundleInfo = async () => {
    if (!bundleId.trim()) {
      setError("Please enter a bundle ID")
      return
    }

    setLoading(true)
    setError(null)
    setBundleInfo(null)

    try {
      console.log("[Test] Fetching bundle info for:", bundleId)
      const response = await fetch(`/api/bundles/${bundleId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("[Test] Bundle info fetched:", data)
      setBundleInfo(data)
    } catch (err) {
      console.error("[Test] Error fetching bundle:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch bundle")
    } finally {
      setLoading(false)
    }
  }

  const addToPurchases = async () => {
    if (!bundleInfo) {
      setError("Please fetch bundle information first")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      console.log("[Test] Adding bundle to purchases:", bundleInfo.id)
      const response = await fetch("/api/test/add-bundle-to-purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bundleId: bundleInfo.id,
          bundleData: bundleInfo,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log("[Test] Complete purchase data being sent:", {
        bundleId: bundleInfo.id,
        bundleData: bundleInfo,
      })
      console.log("[Test] Bundle added to purchases:", result)
      setSuccess(`Bundle successfully added to purchases! Purchase ID: ${result.purchaseId}`)
    } catch (err) {
      console.error("[Test] Error adding bundle to purchases:", err)
      setError(err instanceof Error ? err.message : "Failed to add bundle to purchases")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown"
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return "Invalid date"
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price)
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 text-primary mb-4" />
          <h1 className="text-3xl font-bold">Enter Bundle ID</h1>
          <p className="text-muted-foreground mt-2">
            Enter the bundle ID to fetch information and add to your purchases
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bundle ID Input</CardTitle>
            <CardDescription>Enter the bundle ID and click "Fetch Bundle" to retrieve information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter bundle ID (e.g., 0WTyJRYTgRJIHpn6xJfe)"
                value={bundleId}
                onChange={(e) => setBundleId(e.target.value)}
                className="flex-1"
              />
              <Button onClick={fetchBundleInfo} disabled={loading}>
                {loading ? "Loading..." : "Fetch Bundle"}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {bundleInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Bundle Information
              </CardTitle>
              <CardDescription>Review the bundle details below</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{bundleInfo.title}</h3>
                    <p className="text-muted-foreground text-sm mt-1">{bundleInfo.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Creator:</strong> {bundleInfo.creatorName}
                    </span>
                    {bundleInfo.creatorId && (
                      <Badge variant="outline" className="text-xs">
                        @{bundleInfo.creatorId}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Price:</strong> {formatPrice(bundleInfo.price)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>File Size:</strong> {bundleInfo.fileSize}
                    </span>
                  </div>

                  {bundleInfo.quality && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{bundleInfo.quality}</Badge>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {bundleInfo.thumbnailUrl && (
                    <div>
                      <img
                        src={bundleInfo.thumbnailUrl || "/placeholder.svg"}
                        alt={bundleInfo.title}
                        className="w-full h-48 object-cover rounded-lg border"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder.svg?height=200&width=300&text=No+Image"
                        }}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span>{bundleInfo.views.toLocaleString()} views</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-muted-foreground" />
                      <span>{bundleInfo.downloads.toLocaleString()} downloads</span>
                    </div>
                  </div>

                  {bundleInfo.createdAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Created: {formatDate(bundleInfo.createdAt)}</span>
                    </div>
                  )}

                  {bundleInfo.tags.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Tags:</p>
                      <div className="flex flex-wrap gap-1">
                        {bundleInfo.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex justify-center">
                <Button onClick={addToPurchases} disabled={loading} size="lg" className="min-w-[200px]">
                  {loading ? "Adding..." : "Add to Purchases"}
                </Button>
              </div>

              {/* Debug Information */}
              <details className="mt-6">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  Debug Information (Click to expand)
                </summary>
                <div className="mt-2 p-4 bg-muted rounded-lg">
                  <pre className="text-xs overflow-auto">{JSON.stringify(bundleInfo._raw, null, 2)}</pre>
                </div>
              </details>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
