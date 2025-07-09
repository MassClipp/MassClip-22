"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import Image from "next/image"

interface Purchase {
  id: string
  productBoxId: string
  bundleTitle: string
  thumbnailUrl?: string
  creatorUsername: string
  creatorId: string
  purchaseDate: string
  amount: number
  currency: string
}

export default function PurchasesPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const router = useRouter()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/login")
      return
    }

    fetchPurchases()
  }, [user, authLoading, router])

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

      const data = await response.json()

      // Handle both successful responses and error responses
      if (data.purchases) {
        setPurchases(data.purchases)
      } else {
        setPurchases([])
        if (data.error) {
          console.warn("API returned error:", data.error)
          // Don't show error to user for empty purchases
        }
      }
    } catch (error: any) {
      console.error("Error fetching purchases:", error)
      setPurchases([]) // Set empty array instead of showing error
      // Only show error for actual network/parsing errors
      if (error.name !== "TypeError") {
        setError(error.message || "Failed to load purchases")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOpenContent = (purchase: Purchase) => {
    router.push(`/product-box/${purchase.productBoxId}/content`)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="p-6">
          <h1 className="text-3xl font-bold text-white mb-8">My Purchases</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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

  if (error && purchases.length === 0) {
    return (
      <div className="min-h-screen bg-black">
        <div className="p-6">
          <h1 className="text-3xl font-bold text-white mb-8">My Purchases</h1>
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchPurchases} className="mt-4">
            Try Again
          </Button>
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
            <div className="text-gray-400 text-lg mb-4">No purchases yet</div>
            <div className="text-gray-500 text-sm">Browse creators to find premium content to purchase</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {purchases.map((purchase, index) => (
              <Card
                key={purchase.id}
                className="bg-gray-900/50 border-gray-800 overflow-hidden group hover:bg-gray-900/70 transition-all duration-300"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: "fadeInUp 0.6s ease-out forwards",
                }}
              >
                <div className="relative">
                  {/* Creator Username - Top Left */}
                  <div className="absolute top-3 left-3 z-10">
                    <Link
                      href={`/creator/${purchase.creatorUsername}`}
                      className="text-xs text-white/80 hover:text-white bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm transition-colors"
                    >
                      {purchase.creatorUsername}
                    </Link>
                  </div>

                  {/* Thumbnail */}
                  <div className="aspect-square relative bg-gray-800">
                    {purchase.thumbnailUrl ? (
                      <Image
                        src={purchase.thumbnailUrl || "/placeholder.svg"}
                        alt={purchase.bundleTitle}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-gray-500 text-4xl">📦</div>
                      </div>
                    )}
                  </div>

                  {/* Open Button */}
                  <div className="p-4">
                    <Button
                      onClick={() => handleOpenContent(purchase)}
                      className="w-full bg-white text-black hover:bg-gray-100 font-medium"
                    >
                      Open
                    </Button>
                  </div>
                </div>
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
