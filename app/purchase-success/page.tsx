"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Download, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

interface VerificationResponse {
  success: boolean
  session: {
    id: string
    amount: number
    currency: string
    payment_status: string
    customerEmail?: string
    created: string
    connectedAccount?: string
    retrievalMethod: string
    buyerUid: string
  }
  purchase: {
    id: string
    bundleId: string
    itemId: string
    itemType: string
    buyerUid: string
    creatorId?: string
    amount: number
    currency: string
    status: string
    purchasedAt: string
    verified: boolean
  }
  item: {
    id: string
    title: string
    description: string
    type: string
    price: number
    thumbnailUrl: string
    downloadUrl: string
    fileSize: number
    duration: number
    fileType: string
    tags: string[]
    uploadedAt: any
    creator: {
      id: string
      name: string
      username: string
      profilePicture: string
    }
  }
  alreadyProcessed: boolean
}

function PurchaseSuccessContent() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [verificationData, setVerificationData] = useState<VerificationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    const verifyPurchase = async () => {
      if (!sessionId) {
        setError("No session ID provided")
        setLoading(false)
        return
      }

      // Wait for user authentication
      if (!user) {
        console.log("🔍 [Purchase Success] Waiting for user authentication...")
        return
      }

      try {
        console.log("🔍 [Purchase Success] Starting verification for session:", sessionId)
        console.log("👤 [Purchase Success] Authenticated user:", user.uid)

        // Get the user's ID token
        const idToken = await user.getIdToken()
        console.log("🔐 [Purchase Success] Got ID token for verification")

        const response = await fetch("/api/purchase/verify-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            sessionId,
            idToken,
          }),
        })

        console.log("📡 [Purchase Success] Verification response status:", response.status)

        if (!response.ok) {
          const errorData = await response.json()
          console.error("❌ [Purchase Success] Verification failed:", errorData)

          if (response.status === 401) {
            setError("Authentication required. Please log in to view your purchase.")
          } else if (response.status === 403) {
            setError("This purchase session does not belong to your account.")
          } else if (response.status === 404) {
            setError("Purchase session not found. It may have expired or been processed already.")
          } else {
            setError(errorData.details || errorData.error || "Failed to verify purchase")
          }
          setLoading(false)
          return
        }

        const data: VerificationResponse = await response.json()
        console.log("✅ [Purchase Success] Verification successful:", {
          bundleTitle: data.item.title,
          amount: data.session.amount,
          buyerUid: data.purchase.buyerUid,
          verified: data.purchase.verified,
        })

        setVerificationData(data)
        setLoading(false)

        // Show success toast
        toast.success(`Successfully purchased: ${data.item.title}`)
      } catch (error: any) {
        console.error("❌ [Purchase Success] Verification error:", error)
        setError("Failed to verify purchase. Please try again.")
        setLoading(false)
      }
    }

    verifyPurchase()
  }, [sessionId, user])

  // Show loading while waiting for authentication or verification
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <h2 className="text-lg font-semibold mb-2">{!user ? "Authenticating..." : "Verifying Purchase..."}</h2>
            <p className="text-gray-600 text-center">
              {!user
                ? "Please wait while we authenticate your account..."
                : "Please wait while we verify your purchase..."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Verification Failed</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link href="/dashboard/purchases">View My Purchases</Link>
              </Button>
              <Button variant="outline" asChild className="w-full bg-transparent">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show success state
  if (verificationData) {
    const { session, purchase, item } = verificationData
    const formattedAmount = (session.amount / 100).toFixed(2)

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-600">Purchase Successful!</CardTitle>
            <CardDescription>Your payment has been processed and you now have access to your content.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Purchase Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Purchase Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Amount:</span>
                  <span className="ml-2 font-medium">
                    ${formattedAmount} {session.currency.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Session ID:</span>
                  <span className="ml-2 font-mono text-xs">{session.id.substring(0, 20)}...</span>
                </div>
                <div>
                  <span className="text-gray-600">Purchase Date:</span>
                  <span className="ml-2">{new Date(session.created).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span className="ml-2 text-green-600 font-medium">✓ Verified & Complete</span>
                </div>
              </div>
            </div>

            {/* Bundle Information */}
            <div className="border rounded-lg p-4">
              <div className="flex items-start gap-4">
                {item.thumbnailUrl && (
                  <img
                    src={item.thumbnailUrl || "/placeholder.svg"}
                    alt={item.title}
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  {item.description && <p className="text-gray-600 text-sm mb-3">{item.description}</p>}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>By {item.creator.name}</span>
                    {item.fileSize > 0 && <span>{(item.fileSize / (1024 * 1024)).toFixed(1)} MB</span>}
                    {item.duration > 0 && <span>{Math.round(item.duration / 60)} min</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {item.downloadUrl && (
                <Button asChild className="flex-1">
                  <a href={item.downloadUrl} download>
                    <Download className="h-4 w-4 mr-2" />
                    Download Content
                  </a>
                </Button>
              )}
              <Button variant="outline" asChild className="flex-1 bg-transparent">
                <Link href="/dashboard/purchases">View All Purchases</Link>
              </Button>
              <Button variant="outline" asChild className="flex-1 bg-transparent">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>

            {/* Additional Info */}
            <div className="text-center text-sm text-gray-500 pt-4 border-t">
              <p>
                Your purchase is linked to your account ({user.email}). You can access your content anytime from your
                dashboard.
              </p>
              {verificationData.alreadyProcessed && (
                <p className="mt-2 text-blue-600">Note: This purchase was already processed previously.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
              <h2 className="text-lg font-semibold mb-2">Loading...</h2>
              <p className="text-gray-600 text-center">Please wait while we load your purchase details...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <PurchaseSuccessContent />
    </Suspense>
  )
}
