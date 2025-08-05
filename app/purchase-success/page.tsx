import { notFound, redirect } from "next/navigation"
import { CheckCircle, Package, User, DollarSign } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { db } from "@/lib/firebase-admin"

interface PurchaseSuccessPageProps {
  searchParams: {
    session_id?: string
  }
}

async function getPurchaseDetails(sessionId: string) {
  try {
    const purchaseDoc = await db.collection("bundlePurchases").doc(sessionId).get()

    if (!purchaseDoc.exists) {
      return null
    }

    const purchaseData = purchaseDoc.data()!

    return {
      sessionId: sessionId,
      bundleId: purchaseData.bundleId,
      bundleTitle: purchaseData.bundleTitle || "Untitled Bundle",
      bundleDescription: purchaseData.bundleDescription || "",
      bundleThumbnail: purchaseData.bundleThumbnail || "",
      bundlePrice: purchaseData.bundlePrice || 0,
      creatorUsername: purchaseData.creatorUsername || "Creator",
      creatorDisplayName: purchaseData.creatorDisplayName || purchaseData.creatorUsername || "Creator",
      purchaseAmount: purchaseData.purchaseAmount || 0,
      currency: purchaseData.currency || "usd",
      contentCount: purchaseData.contentCount || 0,
      timestamp: purchaseData.timestamp,
    }
  } catch (error) {
    console.error("Error fetching purchase details:", error)
    return null
  }
}

function formatPrice(amount: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

export default async function PurchaseSuccessPage({ searchParams }: PurchaseSuccessPageProps) {
  const sessionId = searchParams.session_id

  if (!sessionId) {
    redirect("/dashboard/purchases")
  }

  const purchase = await getPurchaseDetails(sessionId)

  if (!purchase) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Success Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Purchase Successful!</h1>
            <p className="text-zinc-400">Thank you for your purchase. Your content is now available.</p>
          </div>

          {/* Purchase Details Card */}
          <Card className="bg-zinc-900 border-zinc-800 mb-8">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Bundle Thumbnail */}
                <div className="w-20 h-20 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden flex-shrink-0">
                  {purchase.bundleThumbnail ? (
                    <img
                      src={purchase.bundleThumbnail || "/placeholder.svg"}
                      alt={purchase.bundleTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-zinc-600" />
                    </div>
                  )}
                </div>

                {/* Bundle Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-white mb-1 truncate">{purchase.bundleTitle}</h2>

                  {purchase.bundleDescription && (
                    <p className="text-zinc-400 text-sm mb-3 line-clamp-2">{purchase.bundleDescription}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-green-400">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-medium">{formatPrice(purchase.purchaseAmount, purchase.currency)}</span>
                    </div>

                    <div className="flex items-center gap-1 text-zinc-400">
                      <User className="w-4 h-4" />
                      <span>by {purchase.creatorDisplayName}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/bundles/${purchase.bundleId}/content?session_id=${purchase.sessionId}`}>
              <Button size="lg" className="w-full sm:w-auto bg-white text-black hover:bg-zinc-200">
                <Package className="w-4 h-4 mr-2" />
                Access Your Content
              </Button>
            </Link>

            <Link href="/dashboard/purchases">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent"
              >
                View All Purchases
              </Button>
            </Link>
          </div>

          {/* Additional Info */}
          <div className="text-center mt-8 text-sm text-zinc-500">
            <p>Your content is now available in your purchases and can be accessed anytime.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
