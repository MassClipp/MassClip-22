"use client"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Download, Eye, Search } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

interface Purchase {
  id: string
  title?: string
  description?: string
  price: number
  currency: string
  status: string
  createdAt: any
  updatedAt: any
  productBoxId?: string
  bundleId?: string
  creatorId?: string
  creatorUsername?: string
  type?: "product_box" | "bundle" | "subscription"
  downloadUrl?: string
  thumbnailUrl?: string
  metadata?: {
    title?: string
    description?: string
    [key: string]: any
  }
}

export default function PurchasesPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")

  useEffect(() => {
    if (user) {
      fetchPurchases()
    }
  }, [user])

  const fetchPurchases = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = await user.getIdToken()
      const response = await fetch("/api/user/unified-purchases", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch purchases: ${response.status}`)
      }

      const data = await response.json()

      // Ensure all purchases have required fields with fallbacks
      const normalizedPurchases = (data.purchases || []).map((purchase: any) => ({
        id: purchase.id || "",
        title: purchase.title || purchase.metadata?.title || "Untitled Purchase",
        description: purchase.description || purchase.metadata?.description || "",
        price: purchase.price || 0,
        currency: purchase.currency || "usd",
        status: purchase.status || "completed",
        createdAt: purchase.createdAt || new Date(),
        updatedAt: purchase.updatedAt || new Date(),
        productBoxId: purchase.productBoxId || null,
        bundleId: purchase.bundleId || null,
        creatorId: purchase.creatorId || "",
        creatorUsername: purchase.creatorUsername || "Unknown Creator",
        type: purchase.type || "product_box",
        downloadUrl: purchase.downloadUrl || "",
        thumbnailUrl: purchase.thumbnailUrl || "",
        metadata: purchase.metadata || {},
      }))

      setPurchases(normalizedPurchases)
    } catch (err) {
      console.error("Error fetching purchases:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch purchases")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (purchase: Purchase) => {
    try {
      const token = await user.getIdToken()
      const endpoint =
        purchase.type === "bundle"
          ? `/api/bundles/${purchase.bundleId}/download`
          : `/api/product-box/${purchase.productBoxId}/direct-content`

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to download content")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${purchase.title || "content"}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Download started",
        description: `${purchase.title} is being downloaded.`,
      })
    } catch (err) {
      console.error("Download error:", err)
      toast({
        title: "Download failed",
        description: "Failed to download the content. Please try again.",
        variant: "destructive",
      })
    }
  }

  const filteredPurchases = purchases.filter((purchase) => {
    const matchesSearch =
      searchQuery === "" ||
      (purchase.title && purchase.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (purchase.description && purchase.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (purchase.creatorUsername && purchase.creatorUsername.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus = filterStatus === "all" || purchase.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const formatPrice = (price: number, currency: string) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(price)
    } catch {
      return `$${price.toFixed(2)}`
    }
  }

  const formatDate = (date: any) => {
    try {
      let dateObj = date
      if (date?.toDate) {
        dateObj = date.toDate()
      } else if (typeof date === "string") {
        dateObj = new Date(date)
      }
      return formatDistanceToNow(dateObj, { addSuffix: true })
    } catch {
      return "Recently"
    }
  }

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchPurchases} className="mt-4 bg-transparent" variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Purchases</h1>
        <p className="text-muted-foreground">View and manage your purchased content</p>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Label htmlFor="search">Search purchases</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="search"
              placeholder="Search by title, description, or creator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="status">Filter by status</Label>
          <select
            id="status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
          >
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Purchases List */}
      {filteredPurchases.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterStatus !== "all"
                ? "No purchases match your filters"
                : "You haven't made any purchases yet"}
            </p>
            {!searchQuery && filterStatus === "all" && (
              <Button asChild>
                <Link href="/dashboard/explore">Explore Content</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPurchases.map((purchase) => (
            <Card key={purchase.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{purchase.title}</CardTitle>
                    <CardDescription>
                      {purchase.creatorUsername && `by ${purchase.creatorUsername}`}
                      {purchase.createdAt && ` • ${formatDate(purchase.createdAt)}`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={purchase.status === "completed" ? "default" : "secondary"}>{purchase.status}</Badge>
                    <span className="font-semibold">{formatPrice(purchase.price, purchase.currency)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {purchase.description && <p className="text-sm text-muted-foreground mb-4">{purchase.description}</p>}
                <div className="flex gap-2">
                  {purchase.status === "completed" && (
                    <>
                      <Button onClick={() => handleDownload(purchase)} size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={
                            purchase.type === "bundle"
                              ? `/bundles/${purchase.bundleId}`
                              : `/product-box/${purchase.productBoxId}/content`
                          }
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Link>
                      </Button>
                    </>
                  )}
                  {purchase.status === "pending" && (
                    <Button size="sm" variant="outline" disabled>
                      Processing...
                    </Button>
                  )}
                  {purchase.status === "failed" && (
                    <Button onClick={fetchPurchases} size="sm" variant="outline">
                      Retry
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
