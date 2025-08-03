"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useAuthContext } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Download, Package, User, DollarSign, CheckCircle, Lock } from "lucide-react"
import Link from "next/link"

interface Bundle {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  fileUrl: string
  fileSize: number
  fileType: string
  price: number
  currency: string
  creatorId: string
  creatorName: string
  creatorUsername: string
  isPublic: boolean
  createdAt: any
  tags: string[]
  category: string
  downloadCount: number
  viewCount: number
  contentItems: string[]
  creator?: {
    id: string
    name: string
    username: string
    profilePicture: string
  }
}

export default function BundlePage() {
  const params = useParams()
  const { user } = useAuthContext()
  const bundleId = params.id as string

  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasPurchased, setHasPurchased] = useState(false)
  const [checkingPurchase, setCheckingPurchase] = useState(false)

  useEffect(() => {
    fetchBundle()
  }, [bundleId])

  useEffect(() => {
    if (user && bundle) {
      checkPurchaseStatus()
    }
  }, [user, bundle])

  const fetchBundle = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/bundles/${bundleId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setBundle(data)
    } catch (err: any) {
      console.error("Error fetching bundle:", err)
      setError(err.message || "Failed to fetch bundle")
    } finally {
      setLoading(false)
    }
  }

  const checkPurchaseStatus = async () => {
    if (!user || !bundle) return

    try {
      setCheckingPurchase(true)

      const response = await fetch(`/api/user/product-box-access?userId=${user.uid}&productBoxId=${bundleId}`)

      if (response.ok) {
        const data = await response.json()
        setHasPurchased(data.hasAccess || false)
      }
    } catch (error) {
      console.error("Error checking purchase status:", error)
    } finally {
      setCheckingPurchase(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatPrice = (amount: number, currency = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  const formatDate = (date: any) => {
    if (!date) return "Unknown"
    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-red-500 mx-auto mb-4" />
            <p className="text-white/60">Loading bundle...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="bg-red-500/10 border-red-500/20 mb-6">
          <Package className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-200">
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>

        <div className="flex gap-4">
          <Button onClick={fetchBundle} className="bg-red-600 hover:bg-red-700">
            Try Again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/bundles">Back to Bundles</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!bundle) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="bg-yellow-500/10 border-yellow-500/20">
          <Package className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-200">Bundle not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bundle Header */}
          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {bundle.thumbnailUrl && (
                  <img
                    src={bundle.thumbnailUrl || "/placeholder.svg"}
                    alt={bundle.title}
                    className="w-24 h-24 rounded-lg object-cover bg-white/5 flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-white mb-2">{bundle.title}</h1>

                  {bundle.creator && (
                    <div className="flex items-center gap-2 mb-3">
                      {bundle.creator.profilePicture && (
                        <img
                          src={bundle.creator.profilePicture || "/placeholder.svg"}
                          alt={bundle.creator.name}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <span className="text-white/70">by {bundle.creator.name}</span>
                      {bundle.creator.username && <span className="text-white/50">@{bundle.creator.username}</span>}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">{bundle.fileType}</Badge>
                    {bundle.isPublic && (
                      <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Public</Badge>
                    )}
                    {bundle.category && (
                      <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">{bundle.category}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {bundle.description && (
            <Card className="bg-black/40 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/70 whitespace-pre-wrap">{bundle.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {bundle.tags && bundle.tags.length > 0 && (
            <Card className="bg-black/40 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {bundle.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="bg-transparent border-white/20 text-white/70">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Purchase/Access Card */}
          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                {hasPurchased ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    Purchased
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5 text-yellow-400" />
                    Purchase Required
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {bundle.price > 0 && (
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{formatPrice(bundle.price, bundle.currency)}</div>
                </div>
              )}

              {hasPurchased ? (
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Download className="h-4 w-4 mr-2" />
                  Download Bundle
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button className="w-full bg-red-600 hover:bg-red-700" disabled>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Purchase Bundle
                  </Button>
                  <p className="text-xs text-white/60 text-center">Purchase functionality coming soon</p>
                </div>
              )}

              {user && (
                <Button asChild variant="outline" className="w-full bg-transparent border-white/10 text-white/80">
                  <Link
                    href={`/test-add-bundle-purchase?bundleId=${bundleId}&userId=${user.uid}&creatorId=${bundle.creatorId}`}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Test Purchase
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Bundle Info */}
          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Bundle Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">File Size:</span>
                <span className="text-white">{formatFileSize(bundle.fileSize)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Created:</span>
                <span className="text-white">{formatDate(bundle.createdAt)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Downloads:</span>
                <span className="text-white">{bundle.downloadCount || 0}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Views:</span>
                <span className="text-white">{bundle.viewCount || 0}</span>
              </div>

              {bundle.contentItems && bundle.contentItems.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Content Items:</span>
                  <span className="text-white">{bundle.contentItems.length}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Creator Info */}
          {bundle.creator && (
            <Card className="bg-black/40 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Creator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {bundle.creator.profilePicture && (
                    <img
                      src={bundle.creator.profilePicture || "/placeholder.svg"}
                      alt={bundle.creator.name}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div>
                    <div className="text-white font-medium">{bundle.creator.name}</div>
                    {bundle.creator.username && <div className="text-white/60 text-sm">@{bundle.creator.username}</div>}
                  </div>
                </div>

                <Button asChild variant="outline" className="w-full mt-4 bg-transparent border-white/10 text-white/80">
                  <Link href={`/creator/${bundle.creator.username || bundle.creatorId}`}>View Profile</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === "development" && (
        <Card className="bg-black/40 backdrop-blur-xl border-white/10 mt-8">
          <CardHeader>
            <CardTitle className="text-white text-sm">Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs text-white/60 overflow-auto bg-black/20 p-4 rounded">
              {JSON.stringify(
                {
                  bundleId,
                  userId: user?.uid,
                  hasPurchased,
                  checkingPurchase,
                  bundle: {
                    id: bundle.id,
                    title: bundle.title,
                    creatorId: bundle.creatorId,
                    price: bundle.price,
                    fileSize: bundle.fileSize,
                  },
                },
                null,
                2,
              )}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
