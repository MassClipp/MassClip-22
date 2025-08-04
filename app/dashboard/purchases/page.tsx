"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/firebase/config"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, Loader2 } from "lucide-react"
import Image from "next/image"

interface Purchase {
  id: string
  bundleId: string
  bundleTitle: string
  bundleDescription: string
  bundleThumbnailUrl: string
  creatorUsername: string
  price: number
  currency: string
  purchaseDate: string
  status: string
  itemCount?: number
}

export default function PurchasesPage() {
  const [user, loading] = useAuthState(auth)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push("/login")
      return
    }

    fetchPurchases()
  }, [user, loading, router])

  const fetchPurchases = async () => {
    try {
      setIsLoading(true)
      const token = await user?.getIdToken()

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
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccessContent = (bundleId: string) => {
    router.push(`/bundles/${bundleId}/content`)
  }

  if (loading || isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 30%, #262626 50%, #1a1a1a 70%, #0d0d0d 100%)",
        }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 30%, #262626 50%, #1a1a1a 70%, #0d0d0d 100%)",
        }}
      >
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={fetchPurchases} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 30%, #262626 50%, #1a1a1a 70%, #0d0d0d 100%)",
      }}
    >
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">My Purchases</h1>

        {purchases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-4">No purchases yet</p>
            <Button onClick={() => router.push("/dashboard/explore")} variant="outline">
              Explore Content
            </Button>
          </div>
        ) : (
          <div className="grid gap-6">
            {purchases.map((purchase) => (
              <Card
                key={purchase.id}
                className="bg-gradient-to-r from-[#0d0d0d] via-[#1a1a1a] to-[#0d0d0d] border-white/20 hover:border-white/40 transition-all duration-300 rounded-lg overflow-hidden"
              >
                <CardContent className="p-0">
                  <div className="flex flex-col">
                    {/* Main content area */}
                    <div className="flex items-center gap-6 p-6">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0">
                        <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-800">
                          {purchase.bundleThumbnailUrl ? (
                            <Image
                              src={purchase.bundleThumbnailUrl || "/placeholder.svg"}
                              alt={purchase.bundleTitle}
                              width={96}
                              height={96}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-gray-500 text-xs">No Image</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bundle info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-white mb-1 truncate">{purchase.bundleTitle}</h3>
                        <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                          {purchase.bundleDescription || "Get now"}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>BY {purchase.creatorUsername?.toUpperCase() || "UNKNOWN"}</span>
                          {purchase.itemCount && <span>{purchase.itemCount} ITEMS</span>}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex-shrink-0 text-right">
                        <div className="text-2xl font-bold text-white">${(purchase.price / 100).toFixed(2)}</div>
                      </div>
                    </div>

                    {/* Button area */}
                    <div className="px-6 pb-6 flex justify-center">
                      <Button
                        onClick={() => handleAccessContent(purchase.bundleId)}
                        className="bg-white text-black hover:bg-gray-200 font-medium px-8 py-2 rounded-lg w-full max-w-xs"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Access Content
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
