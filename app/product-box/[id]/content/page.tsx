"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Lock, ShoppingBag, Download, Play, FileText, ImageIcon, Music } from "lucide-react"
import type { UnifiedPurchase, UnifiedPurchaseItem } from "@/lib/unified-purchase-service"

interface ContentPageState {
  loading: boolean
  hasAccess: boolean
  error: string | null
  purchase: UnifiedPurchase | null
  items: UnifiedPurchaseItem[]
}

export default function ProductBoxContentPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [state, setState] = useState<ContentPageState>({
    loading: true,
    hasAccess: false,
    error: null,
    purchase: null,
    items: [],
  })

  const productBoxId = params.id as string

  useEffect(() => {
    if (!user || !productBoxId) {
      setState((prev) => ({ ...prev, loading: false, error: "Missing user or product box ID" }))
      return
    }

    checkAccess()
  }, [user, productBoxId])

  const checkAccess = async () => {
    if (!user || !productBoxId) return

    try {
      console.log(`🔍 [Content Page] Fetching content for product box: ${productBoxId}`)

      const idToken = await user.getIdToken()

      // First, try to get unified purchases
      const unifiedResponse = await fetch("/api/user/unified-purchases", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (unifiedResponse.ok) {
        const unifiedPurchases: UnifiedPurchase[] = await unifiedResponse.json()
        console.log(`📦 [Content Page] Found unified purchases: ${unifiedPurchases.length}`)
        console.log(`🔍 [Content Page] Purchase data sample:`, unifiedPurchases.slice(0, 2))

        // Case-insensitive search for the product box
        const matchingPurchase = unifiedPurchases.find(
          (purchase) =>
            purchase.productBoxId.toLowerCase() === productBoxId.toLowerCase() ||
            purchase.itemId?.toLowerCase() === productBoxId.toLowerCase(),
        )

        if (matchingPurchase) {
          console.log(`✅ [Content Page] Found matching unified purchase!`)
          setState({
            loading: false,
            hasAccess: true,
            error: null,
            purchase: matchingPurchase,
            items: matchingPurchase.items || [],
          })
          return
        } else {
          console.log(`❌ [Content Page] No matching purchase found in unified purchases`)
        }
      }

      // If no unified purchase found, check legacy purchases
      console.log(`🔍 [Content Page] Unified purchase not found, checking legacy purchases...`)

      const legacyResponse = await fetch("/api/user/purchases", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (legacyResponse.ok) {
        const legacyPurchases = await legacyResponse.json()
        console.log(`📦 [Content Page] Found legacy purchases: ${legacyPurchases.length}`)
        console.log(`🔍 [Content Page] Legacy purchase data sample:`, legacyPurchases.slice(0, 2))

        // Case-insensitive search in legacy purchases
        const matchingLegacyPurchase = legacyPurchases.find(
          (purchase: any) =>
            purchase.productBoxId?.toLowerCase() === productBoxId.toLowerCase() ||
            purchase.itemId?.toLowerCase() === productBoxId.toLowerCase(),
        )

        if (matchingLegacyPurchase) {
          console.log(`✅ [Content Page] Found legacy purchase, attempting automatic migration...`)

          // Try to migrate the legacy purchase
          try {
            const migrationResponse = await fetch("/api/migrate-product-box-purchase", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                productBoxId: productBoxId,
                legacyPurchaseData: matchingLegacyPurchase,
              }),
            })

            if (migrationResponse.ok) {
              console.log(`✅ [Content Page] Migration successful, retrying content fetch...`)
              // Retry the unified purchases fetch
              setTimeout(() => checkAccess(), 1000)
              return
            } else {
              console.error(`❌ [Content Page] Migration failed`)
            }
          } catch (migrationError) {
            console.error(`❌ [Content Page] Migration error:`, migrationError)
          }

          // If migration fails, try to fetch content directly
          console.log(`🔄 [Content Page] Trying to fetch content directly...`)
          try {
            const contentResponse = await fetch(`/api/product-box/${productBoxId}/content`, {
              headers: {
                Authorization: `Bearer ${idToken}`,
              },
            })

            if (contentResponse.ok) {
              const contentData = await contentResponse.json()
              console.log(`✅ [Content Page] Direct content fetch successful`)

              setState({
                loading: false,
                hasAccess: true,
                error: null,
                purchase: null, // No unified purchase object
                items: contentData.items || [],
              })
              return
            }
          } catch (contentError) {
            console.error(`❌ [Content Page] Direct content fetch failed:`, contentError)
          }
        }
      }

      // No access found
      console.error(`❌ [Content Page] ACCESS DENIED - No valid purchase found for product box: ${productBoxId}`)
      setState({
        loading: false,
        hasAccess: false,
        error: "No valid purchase found for this content",
        purchase: null,
        items: [],
      })
    } catch (error: any) {
      console.error(`❌ [Content Page] Error checking access:`, error)
      setState({
        loading: false,
        hasAccess: false,
        error: error.message || "Failed to verify access",
        purchase: null,
        items: [],
      })
    }
  }

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case "video":
        return <Play className="h-5 w-5" />
      case "audio":
        return <Music className="h-5 w-5" />
      case "image":
        return <ImageIcon className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const handleDownload = async (item: UnifiedPurchaseItem) => {
    try {
      console.log(`📥 [Download] Starting download for: ${item.title}`)

      // Create a temporary link to trigger download
      const link = document.createElement("a")
      link.href = item.fileUrl
      link.download = item.filename || item.title
      link.target = "_blank"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      console.log(`✅ [Download] Download initiated for: ${item.title}`)
    } catch (error) {
      console.error(`❌ [Download] Error downloading ${item.title}:`, error)
    }
  }

  // Loading state
  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Loading Content</h2>
            <p className="text-gray-600">Verifying your access...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Access denied state
  if (!state.hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Lock className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              {state.error || "You don't have access to this content. Please purchase it first."}
            </p>
            <div className="space-y-2">
              <Button onClick={() => router.push("/dashboard/purchases")} className="w-full">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Return to Purchases
              </Button>
              <Button onClick={checkAccess} variant="outline" className="w-full bg-transparent">
                🔄 Retry Access
              </Button>
              <Button onClick={() => router.push("/dashboard")} variant="outline" className="w-full">
                🏠 Debug Purchase
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Content display
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{state.purchase?.productBoxTitle || "Your Content"}</h1>
          <p className="text-gray-600">
            {state.purchase?.productBoxDescription || "Access your purchased content below"}
          </p>
          {state.purchase && (
            <div className="mt-2 text-sm text-gray-500">
              Purchased on {new Date(state.purchase.purchasedAt).toLocaleDateString()} •{state.items.length} items •
              Total size: {formatFileSize(state.purchase.totalSize)}
            </div>
          )}
        </div>

        {/* Content Grid */}
        {state.items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {state.items.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getContentIcon(item.contentType)}
                      <CardTitle className="text-lg truncate">{item.displayTitle}</CardTitle>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <div>Size: {item.displaySize}</div>
                    {item.displayResolution && <div>Resolution: {item.displayResolution}</div>}
                    {item.displayDuration && <div>Duration: {item.displayDuration}</div>}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Thumbnail */}
                  {item.thumbnailUrl && (
                    <div className="mb-3">
                      <img
                        src={item.thumbnailUrl || "/placeholder.svg"}
                        alt={item.title}
                        className="w-full h-32 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg?height=128&width=200"
                        }}
                      />
                    </div>
                  )}

                  {/* Description */}
                  {item.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>}

                  {/* Download Button */}
                  <Button onClick={() => handleDownload(item)} className="w-full" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Content Available</h3>
              <p className="text-gray-600 mb-4">This product box doesn't contain any content items yet.</p>
              <Button onClick={() => router.push("/dashboard/purchases")}>Return to Purchases</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}
