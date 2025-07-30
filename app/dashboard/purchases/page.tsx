"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useUser } from "@/hooks/useUser"
import { ExternalLink, Download, Play } from "lucide-react"
import Link from "next/link"

interface Purchase {
  id: string
  type: "bundle" | "product_box"
  bundleId?: string
  productBoxId?: string
  sessionId: string
  status: string
  amount: number
  currency: string
  createdAt: string
  bundleData?: {
    title: string
    description: string
    thumbnailUrl: string
    contentItems: any[]
  }
  productBoxData?: {
    title: string
    description: string
    thumbnailUrl: string
  }
}

export default function PurchasesPage() {
  const { user, loading: userLoading } = useUser()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPurchases()
  }, [user])

  const fetchPurchases = async () => {
    try {
      setLoading(true)
      setError(null)

      // Build query parameters
      const params = new URLSearchParams()

      // Try to get session ID from URL if user is not authenticated
      if (!user) {
        const urlParams = new URLSearchParams(window.location.search)
        const sessionId = urlParams.get("session_id") || localStorage.getItem("lastSessionId")
        if (sessionId) {
          params.append("sessionId", sessionId)
        }
      }

      const response = await fetch(`/api/user/unified-purchases?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setPurchases(data.purchases || [])
        console.log("[Purchases Page] Loaded purchases:", data.purchases?.length || 0)
      } else {
        setError(data.error || "Failed to load purchases")
      }
    } catch (err) {
      console.error("[Purchases Page] Error:", err)
      setError("Failed to load purchases")
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (userLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Purchases</h1>
        <p className="text-muted-foreground">Access your purchased content and manage your downloads</p>
      </div>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchPurchases} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {purchases.length === 0 && !loading && !error ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">No purchases found</p>
            <Link href="/dashboard/explore">
              <Button>Browse Content</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {purchases.map((purchase) => (
            <Card key={purchase.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">
                      {purchase.type === "bundle" ? purchase.bundleData?.title : purchase.productBoxData?.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Purchased on {formatDate(purchase.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={purchase.status === "completed" ? "default" : "secondary"}>{purchase.status}</Badge>
                    <p className="text-sm font-medium mt-1">{formatPrice(purchase.amount, purchase.currency)}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  {purchase.type === "bundle" ? purchase.bundleData?.description : purchase.productBoxData?.description}
                </p>

                {purchase.type === "bundle" && purchase.bundleData?.contentItems && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Content Items: {purchase.bundleData.contentItems.length}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {purchase.type === "bundle" && purchase.bundleId && (
                    <Link href={`/bundles/${purchase.bundleId}`}>
                      <Button>
                        <Play className="w-4 h-4 mr-2" />
                        Access Bundle
                      </Button>
                    </Link>
                  )}

                  {purchase.type === "product_box" && purchase.productBoxId && (
                    <Link href={`/product-box/${purchase.productBoxId}/content`}>
                      <Button>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Access Content
                      </Button>
                    </Link>
                  )}

                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download Receipt
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
