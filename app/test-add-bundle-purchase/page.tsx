"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import {
  Copy,
  Package,
  User,
  DollarSign,
  Eye,
  Download,
  Calendar,
  HardDrive,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BundleData {
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
  downloadUrl?: string
  fileType?: string
  currency?: string
  isPublic?: boolean
  _raw?: any
  _creator?: any
}

interface PurchaseResult {
  success: boolean
  message: string
  data?: {
    purchaseId: string
    sessionId: string
    userId: string
    bundleId: string
    bundleTitle: string
    bundleDescription: string
    creatorName: string
    amount: number
    currency: string
    purchasedAt: string
  }
  error?: string
  details?: string
}

export default function TestAddBundlePurchasePage() {
  const [userId, setUserId] = useState("")
  const [bundleId, setBundleId] = useState("")
  const [bundleData, setBundleData] = useState<BundleData | null>(null)
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const { toast } = useToast()

  // Get current user on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/session")
        if (response.ok) {
          const data = await response.json()
          if (data.user) {
            setCurrentUser(data.user)
            setUserId(data.user.uid)
          }
        }
      } catch (error) {
        console.log("No current user session")
      }
    }
    getCurrentUser()
  }, [])

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      })
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      })
    }
  }

  const fetchBundle = async () => {
    if (!bundleId.trim()) {
      toast({
        title: "Bundle ID required",
        description: "Please enter a bundle ID",
        variant: "destructive",
      })
      return
    }

    setIsFetching(true)
    setBundleData(null)
    setPurchaseResult(null)

    try {
      console.log("🔍 Fetching bundle:", bundleId)
      const response = await fetch(`/api/bundles/${bundleId}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Bundle not found")
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("✅ Bundle data received:", data)
      setBundleData(data)

      toast({
        title: "Bundle found!",
        description: `Loaded: ${data.title}`,
      })
    } catch (error: any) {
      console.error("❌ Error fetching bundle:", error)
      toast({
        title: "Error fetching bundle",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsFetching(false)
    }
  }

  const addBundleToPurchases = async () => {
    if (!userId.trim()) {
      toast({
        title: "User ID required",
        description: "Please enter a user ID",
        variant: "destructive",
      })
      return
    }

    if (!bundleId.trim()) {
      toast({
        title: "Bundle ID required",
        description: "Please enter a bundle ID",
        variant: "destructive",
      })
      return
    }

    if (!bundleData) {
      toast({
        title: "Fetch bundle first",
        description: "Please fetch the bundle data before adding to purchases",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setPurchaseResult(null)

    try {
      console.log("💾 Adding bundle to purchases:", { userId, bundleId })

      const response = await fetch("/api/test/add-bundle-to-purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId.trim(),
          bundleId: bundleId.trim(),
        }),
      })

      const result = await response.json()
      console.log("📝 Purchase result:", result)

      if (response.ok && result.success) {
        setPurchaseResult(result)
        toast({
          title: "Success!",
          description: "Bundle added to user's purchases",
        })
      } else {
        throw new Error(result.details || result.error || "Unknown error")
      }
    } catch (error: any) {
      console.error("❌ Error adding bundle to purchases:", error)
      setPurchaseResult({
        success: false,
        message: "Failed to add bundle to purchases",
        error: error.message,
        details: error.stack,
      })
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
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
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Add Bundle to User Purchases</h1>
          <p className="text-muted-foreground">Enter a user ID and bundle ID to add the bundle to their purchases</p>
        </div>

        {/* Current User Info */}
        {currentUser && (
          <Alert>
            <User className="h-4 w-4" />
            <AlertDescription>
              Current user: <strong>{currentUser.email}</strong> (UID: {currentUser.uid})
            </AlertDescription>
          </Alert>
        )}

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Bundle Purchase Setup</CardTitle>
            <CardDescription>Enter the user ID and bundle ID to process</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User ID Input */}
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <div className="flex gap-2">
                <Input
                  id="userId"
                  placeholder="Enter user ID (Firebase UID)"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="font-mono"
                />
                {currentUser && (
                  <Button variant="outline" size="sm" onClick={() => setUserId(currentUser.uid)}>
                    Use Current
                  </Button>
                )}
                {userId && (
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(userId, "User ID")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Bundle ID Input */}
            <div className="space-y-2">
              <Label htmlFor="bundleId">Bundle ID</Label>
              <div className="flex gap-2">
                <Input
                  id="bundleId"
                  placeholder="Enter bundle ID"
                  value={bundleId}
                  onChange={(e) => setBundleId(e.target.value)}
                  className="font-mono"
                />
                <Button variant="outline" size="sm" onClick={() => setBundleId("0WTyJRYTgRJlHpn6xJfe")}>
                  Test ID
                </Button>
                {bundleId && (
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(bundleId, "Bundle ID")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={fetchBundle} disabled={!bundleId.trim() || isFetching} variant="outline">
                {isFetching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Fetch Bundle
                  </>
                )}
              </Button>

              <Button
                onClick={addBundleToPurchases}
                disabled={!userId.trim() || !bundleId.trim() || !bundleData || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Add to Purchases
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bundle Preview */}
        {bundleData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Bundle Info */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-xl">{bundleData.title}</CardTitle>
                      <CardDescription>{bundleData.description}</CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {formatPrice(bundleData.price)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Creator Info */}
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{bundleData.creatorName}</p>
                        <p className="text-sm text-muted-foreground">@{bundleData.creatorId}</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{bundleData.views.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Views</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{bundleData.downloads.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Downloads</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{bundleData.fileSize}</p>
                          <p className="text-xs text-muted-foreground">File Size</p>
                        </div>
                      </div>
                      {bundleData.createdAt && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{formatDate(bundleData.createdAt)}</p>
                            <p className="text-xs text-muted-foreground">Created</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {bundleData.tags.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium mb-2">Tags</p>
                          <div className="flex flex-wrap gap-2">
                            {bundleData.tags.map((tag, index) => (
                              <Badge key={index} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {bundleData.thumbnailUrl ? (
                    <img
                      src={bundleData.thumbnailUrl || "/placeholder.svg"}
                      alt={bundleData.title}
                      className="w-full h-32 object-cover rounded-lg border"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg?height=128&width=200&text=No+Preview"
                      }}
                    />
                  ) : (
                    <div className="w-full h-32 bg-muted rounded-lg border flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bundle Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bundle ID:</span>
                    <span className="font-mono text-xs">{bundleData.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File Type:</span>
                    <span>{bundleData.fileType || "Unknown"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quality:</span>
                    <span>{bundleData.quality || "Unknown"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Public:</span>
                    <span>{bundleData.isPublic ? "✅ Yes" : "❌ No"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Download URL:</span>
                    <span>{bundleData.downloadUrl ? "✅ Available" : "❌ None"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Purchase Result */}
        {purchaseResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {purchaseResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                Purchase Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              {purchaseResult.success ? (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="text-green-700">{purchaseResult.message}</AlertDescription>
                  </Alert>

                  {purchaseResult.data && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Purchase Details</p>
                        <div className="space-y-1 mt-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Purchase ID:</span>
                            <span className="font-mono text-xs">{purchaseResult.data.purchaseId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Session ID:</span>
                            <span className="font-mono text-xs">{purchaseResult.data.sessionId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount:</span>
                            <span>{formatPrice(purchaseResult.data.amount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Purchased:</span>
                            <span>{formatDate(purchaseResult.data.purchasedAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="font-medium">Bundle & User Info</p>
                        <div className="space-y-1 mt-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">User ID:</span>
                            <span className="font-mono text-xs">{purchaseResult.data.userId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Bundle:</span>
                            <span className="truncate">{purchaseResult.data.bundleTitle}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Creator:</span>
                            <span>{purchaseResult.data.creatorName}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{purchaseResult.message}</AlertDescription>
                  </Alert>

                  {purchaseResult.details && (
                    <div>
                      <p className="font-medium text-sm mb-2">Error Details:</p>
                      <Textarea value={purchaseResult.details} readOnly className="font-mono text-xs" rows={6} />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Debug Info */}
        {bundleData?._raw && (
          <Card>
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
              <CardDescription>Raw bundle data from database</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={JSON.stringify(bundleData._raw, null, 2)}
                readOnly
                className="font-mono text-xs"
                rows={10}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
