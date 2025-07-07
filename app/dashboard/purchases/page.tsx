"use client"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { Play, User, Calendar, DollarSign } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Purchase {
  id: string
  productBoxId: string
  bundleId?: string
  title: string
  description?: string
  thumbnailUrl?: string
  creatorId: string
  creatorUsername: string
  creatorDisplayName?: string
  purchaseDate: string
  amount: number
  currency: string
  status: string
  type: "product-box" | "bundle"
}

export default function PurchasesPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const { toast } = useToast()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchPurchases()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [user, authLoading])

  const fetchPurchases = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/user/unified-purchases", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch purchases: ${response.status}`)
      }

      const data = await response.json()
      setPurchases(data.purchases || [])
    } catch (error: any) {
      console.error("Error fetching purchases:", error)
      setError(error.message || "Failed to load purchases")
      toast({
        title: "Error",
        description: "Failed to load your purchases",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenContent = (purchase: Purchase) => {
    const contentId = purchase.productBoxId || purchase.bundleId
    if (contentId) {
      window.location.href = `/product-box/${contentId}/content`
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return "Unknown date"
    }
  }

  const formatPrice = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(amount)
    } catch {
      return `$${amount}`
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="p-6">
          <h1 className="text-3xl font-bold text-white mb-8">My Purchases</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full bg-gray-800" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 bg-gray-800" />
                  <Skeleton className="h-10 w-full bg-gray-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
          <p className="text-gray-400 mb-6">Please log in to view your purchases</p>
          <Button asChild>
            <Link href="/login">Log In</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <div className="p-6">
          <h1 className="text-3xl font-bold text-white mb-8">My Purchases</h1>
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={fetchPurchases} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="p-6">
        <h1 className="text-3xl font-bold text-white mb-8">My Purchases</h1>

        {purchases.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-6">
              <DollarSign className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No Purchases Yet</h2>
              <p className="text-gray-400 mb-6">
                You haven't purchased any content yet. Explore creators and find content you love!
              </p>
              <Button asChild>
                <Link href="/dashboard/explore">Explore Content</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {purchases.map((purchase, index) => (
              <Card
                key={purchase.id}
                className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-all duration-300 group overflow-hidden"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: "fadeInUp 0.6s ease-out forwards",
                }}
              >
                <CardContent className="p-0">
                  {/* Thumbnail */}
                  <div className="aspect-square relative overflow-hidden bg-gray-800">
                    {purchase.thumbnailUrl ? (
                      <Image
                        src={purchase.thumbnailUrl || "/placeholder.svg"}
                        alt={purchase.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="h-12 w-12 text-gray-600" />
                      </div>
                    )}

                    {/* Creator Username - Top Left */}
                    <div className="absolute top-3 left-3">
                      <Button
                        asChild
                        variant="secondary"
                        size="sm"
                        className="bg-black/70 hover:bg-black/90 text-white border-0 text-xs px-2 py-1 h-auto backdrop-blur-sm"
                      >
                        <Link href={`/creator/${purchase.creatorUsername}`}>
                          <User className="h-3 w-3 mr-1" />
                          {purchase.creatorUsername}
                        </Link>
                      </Button>
                    </div>

                    {/* Purchase Info - Top Right */}
                    <div className="absolute top-3 right-3 flex flex-col gap-1">
                      <Badge variant="secondary" className="bg-green-600/80 text-white text-xs">
                        Owned
                      </Badge>
                      {purchase.type && (
                        <Badge variant="outline" className="border-gray-600 text-gray-300 text-xs">
                          {purchase.type === "product-box" ? "Bundle" : "Collection"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Content Info */}
                  <div className="p-4 space-y-3">
                    {/* Title */}
                    <h3 className="font-medium text-white text-sm line-clamp-2 min-h-[2.5rem]">{purchase.title}</h3>

                    {/* Purchase Details */}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(purchase.purchaseDate)}
                      </div>
                      <div className="font-medium text-green-400">
                        {formatPrice(purchase.amount, purchase.currency)}
                      </div>
                    </div>

                    {/* Open Button */}
                    <Button
                      onClick={() => handleOpenContent(purchase)}
                      className="w-full bg-white hover:bg-gray-100 text-black font-medium"
                      size="sm"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
