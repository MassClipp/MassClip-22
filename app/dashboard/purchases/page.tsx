"use client"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { ShoppingBag, ExternalLink, AlertCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Purchase {
  id: string
  productBoxId: string
  bundleTitle: string
  creatorUsername: string
  creatorId: string
  thumbnailUrl?: string
  purchaseDate: string
  amount: number
  currency: string
  status: string
}

export default function PurchasesPage() {
  const { user } = useFirebaseAuth()
  const { toast } = useToast()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchPurchases()
    }
  }, [user])

  const fetchPurchases = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = await user?.getIdToken()
      if (!token) {
        throw new Error("No authentication token")
      }

      const response = await fetch("/api/user/unified-purchases", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch purchases")
      }

      const data = await response.json()
      setPurchases(data.purchases || [])
    } catch (error) {
      console.error("Error fetching purchases:", error)
      setError("Failed to load purchases")
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
    // Navigate to the content
    window.location.href = `/product-box/${purchase.productBoxId}/content`
  }

  const handleCreatorClick = (creatorUsername: string) => {
    // Navigate to creator profile
    window.location.href = `/creator/${creatorUsername}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        {/* Title */}
        <div className="p-6">
          <h1 className="text-3xl font-bold text-white mb-8">My Purchases</h1>
        </div>

        {/* Loading Grid */}
        <div className="px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full bg-gray-800" />
                <Skeleton className="h-4 w-20 bg-gray-800" />
                <Skeleton className="h-10 w-full bg-gray-800" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <div className="p-6">
          <h1 className="text-3xl font-bold text-white mb-8">My Purchases</h1>
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
            <p className="text-red-400 text-lg mb-4">{error}</p>
            <Button onClick={fetchPurchases} variant="outline" className="border-gray-600 bg-transparent text-white">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Title */}
      <div className="p-6">
        <h1 className="text-3xl font-bold text-white mb-8">My Purchases</h1>
      </div>

      {/* Content */}
      <div className="px-6 pb-6">
        {purchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="h-16 w-16 text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-400 mb-2">No purchases yet</h2>
            <p className="text-gray-500 text-center mb-6">When you purchase premium content, it will appear here.</p>
            <Button asChild className="bg-white text-black hover:bg-gray-200">
              <Link href="/dashboard/explore">Explore Content</Link>
            </Button>
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
                  {/* Creator Username - Top Left */}
                  <div className="absolute top-3 left-3 z-10">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCreatorClick(purchase.creatorUsername)}
                      className="bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 text-xs px-2 py-1 h-auto"
                    >
                      @{purchase.creatorUsername}
                    </Button>
                  </div>

                  {/* Thumbnail */}
                  <div className="relative aspect-square overflow-hidden">
                    {purchase.thumbnailUrl ? (
                      <Image
                        src={purchase.thumbnailUrl || "/placeholder.svg"}
                        alt={purchase.bundleTitle}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <ShoppingBag className="h-12 w-12 text-gray-600" />
                      </div>
                    )}

                    {/* Status Badge */}
                    {purchase.status && (
                      <div className="absolute top-3 right-3">
                        <Badge
                          variant={purchase.status === "completed" ? "default" : "secondary"}
                          className="bg-green-600 text-white text-xs"
                        >
                          {purchase.status}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Open Button */}
                  <div className="p-4">
                    <Button
                      onClick={() => handleOpenContent(purchase)}
                      className="w-full bg-white text-black hover:bg-gray-200 font-medium"
                    >
                      Open
                      <ExternalLink className="h-4 w-4 ml-2" />
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
